using SympAPI.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SympAPI.Services
{
    public class ExternalModelService : IExternalModelService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<ExternalModelService> _logger;

        public ExternalModelService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<ExternalModelService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        public async Task<InteractiveResponse?> GetInteractiveResponseAsync(SymptomRequest request, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request?.Symptom))
                throw new ArgumentException("Symptom required", nameof(request));

            var client = CreateClient();
            var messages = BuildChatMessages(request);

            var payload = JsonSerializer.Serialize(new
            {
                model = _config["GITHUB_MODEL"],
                messages,
                temperature = 0
            });

            using var httpContent = new StringContent(payload, Encoding.UTF8, "application/json");

            const int maxAttempts = 3;
            for (int attempt = 1; attempt <= maxAttempts; attempt++)
            {
                using var response = await client.PostAsync("chat/completions", httpContent, cancellationToken);
                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                // propagate 429 so controller can map to 429
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    _logger.LogWarning("Interactive API returned 429 TooManyRequests on attempt {Attempt}", attempt);
                    throw new HttpRequestException("Rate limit exceeded", null, response.StatusCode);
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Interactive API error: {Content}", content);
                    throw new InvalidOperationException("Interactive API failed: " + content);
                }

                // Extract content text from model response
                string text;
                try
                {
                    var doc = JsonDocument.Parse(content);
                    text = doc.RootElement
                        .GetProperty("choices")[0]
                        .GetProperty("message")
                        .GetProperty("content")
                        .GetString() ?? string.Empty;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse model wrapper response on attempt {Attempt}. Raw: {Raw}", attempt, content);
                    if (attempt == maxAttempts) throw;
                    await Task.Delay(300 * attempt, cancellationToken);
                    continue;
                }

                if (string.IsNullOrWhiteSpace(text))
                {
                    _logger.LogWarning("Empty content returned from model on attempt {Attempt}. Raw: {Raw}", attempt, content);
                    if (attempt == maxAttempts) return new ErrorResponse { ErrorCode = "empty_response", Message = "Empty response from model" };
                    await Task.Delay(300 * attempt, cancellationToken);
                    continue;
                }

                // Attempt to extract JSON block and repair
                var jsonBlock = ExtractFirstJsonBlock(text) ?? text;
                var cleanedJson = FormattedJson(jsonBlock);

                // If still not valid JSON, try one more attempt (retry loop will repeat)
                if (!IsValidJson(cleanedJson))
                {
                    _logger.LogWarning("Model returned non-JSON or malformed JSON on attempt {Attempt}. Trying raw text fallback. Raw: {RawSnippet}", attempt, text.Length > 200 ? text[..200] : text);
                    if (attempt == maxAttempts)
                    {
                        // return an error payload for UI to display rather than throwing
                        return new ErrorResponse
                        {
                            ErrorCode = "invalid_json",
                            Message = "The external model returned malformed JSON and could not be repaired."
                        };
                    }

                    await Task.Delay(300 * attempt, cancellationToken);
                    continue;
                }

                // Parse cleaned JSON and map to InteractiveResponse variants
                try
                {
                    using var parsed = JsonDocument.Parse(cleanedJson);
                    var root = parsed.RootElement;

                    // If an array was returned, take first element as the object
                    if (root.ValueKind == JsonValueKind.Array)
                    {
                        if (root.GetArrayLength() == 0)
                        {
                            _logger.LogWarning("Model returned empty array for interactive on attempt {Attempt}", attempt);
                            if (attempt == maxAttempts) return new ErrorResponse { ErrorCode = "empty_array", Message = "Model returned empty array" };
                            await Task.Delay(300 * attempt, cancellationToken);
                            continue;
                        }
                        root = root[0];
                    }

                    if (root.ValueKind != JsonValueKind.Object)
                    {
                        _logger.LogWarning("Unexpected JSON root kind for interactive: {Kind}", root.ValueKind);
                        if (attempt == maxAttempts) return new ErrorResponse { ErrorCode = "unexpected_json", Message = "Unexpected JSON structure from model" };
                        await Task.Delay(300 * attempt, cancellationToken);
                        continue;
                    }

                    // Read type if present
                    string type = null;
                    if (root.TryGetProperty("type", out var typeEl) && typeEl.ValueKind == JsonValueKind.String)
                        type = typeEl.GetString();

                    // Map known shapes
                    if (string.Equals(type, "question", StringComparison.OrdinalIgnoreCase) || root.TryGetProperty("question", out var _))
                    {
                        var q = new QuestionResponse();
                        if (root.TryGetProperty("question", out var qEl) && qEl.ValueKind == JsonValueKind.String)
                            q = q with { Question = qEl.GetString() ?? string.Empty };

                        if (root.TryGetProperty("options", out var opts) && opts.ValueKind == JsonValueKind.Array)
                        {
                            q = q with { Options = opts.EnumerateArray().Select(e => e.ValueKind == JsonValueKind.String ? e.GetString() ?? string.Empty : e.ToString()).ToList() };
                        }

                        if (root.TryGetProperty("multiple", out var m) && m.ValueKind == JsonValueKind.True)
                            q = q with { Multiple = true };

                        return q;
                    }

                    if (string.Equals(type, "summary", StringComparison.OrdinalIgnoreCase) || root.TryGetProperty("summaryText", out var _))
                    {
                        var s = new SummaryResponse();
                        if (root.TryGetProperty("symptom", out var sym) && sym.ValueKind == JsonValueKind.String)
                            s = s with { Symptom = sym.GetString() ?? string.Empty };

                        if (root.TryGetProperty("summaryText", out var st) && st.ValueKind == JsonValueKind.String)
                            s = s with { SummaryText = st.GetString() ?? string.Empty };

                        if (root.TryGetProperty("answers", out var ans) && ans.ValueKind == JsonValueKind.Array)
                        {
                            var list = new List<FollowUpAnswer>();
                            foreach (var a in ans.EnumerateArray())
                            {
                                if (a.ValueKind == JsonValueKind.Object)
                                {
                                    var qv = a.TryGetProperty("question", out var qq) && qq.ValueKind == JsonValueKind.String ? qq.GetString() ?? string.Empty : string.Empty;
                                    var av = a.TryGetProperty("answer", out var aa) && aa.ValueKind == JsonValueKind.String ? aa.GetString() ?? string.Empty : string.Empty;
                                    if (!string.IsNullOrWhiteSpace(qv))
                                        list.Add(new FollowUpAnswer { Question = qv, Answer = av });
                                }
                            }
                            s = s with { Answers = list };
                        }

                        return s;
                    }

                    if (string.Equals(type, "error", StringComparison.OrdinalIgnoreCase) || root.TryGetProperty("errorCode", out var _))
                    {
                        var e = new ErrorResponse();
                        if (root.TryGetProperty("errorCode", out var ec) && ec.ValueKind == JsonValueKind.String)
                            e = e with { ErrorCode = ec.GetString() ?? string.Empty };
                        if (root.TryGetProperty("message", out var msg) && msg.ValueKind == JsonValueKind.String)
                            e = e with { Message = msg.GetString() ?? string.Empty };
                        return e;
                    }

                    // Fallback: attempt to interpret as question if 'question' exists, else return generic error
                    if (root.TryGetProperty("question", out var qf))
                    {
                        var q = new QuestionResponse { Question = qf.GetString() ?? string.Empty };
                        if (root.TryGetProperty("options", out var opts) && opts.ValueKind == JsonValueKind.Array)
                            q = q with { Options = opts.EnumerateArray().Select(e => e.GetString() ?? string.Empty).ToList() };
                        return q;
                    }

                    return new ErrorResponse { ErrorCode = "unknown_shape", Message = "Model returned valid JSON but shape was not recognized." };
                }
                catch (JsonException jex)
                {
                    _logger.LogWarning(jex, "JSON parse failure for interactive on attempt {Attempt}", attempt);
                    if (attempt == maxAttempts)
                        return new ErrorResponse { ErrorCode = "parse_failure", Message = "Failed to parse model JSON response" };
                    await Task.Delay(300 * attempt, cancellationToken);
                    continue;
                }
            }

            // unreachable but satisfy compiler
            return new ErrorResponse { ErrorCode = "unknown", Message = "Unexpected failure" };
        }

        public async Task<List<DiagnosisResponse>> DiagnoseSymptomsAsync(DiagnosisRequest request, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request?.Symptom))
                throw new ArgumentException("Symptom required", nameof(request));

            var client = CreateClient();
            var messages = BuildDiagnosisMessages(request);

            var payload = JsonSerializer.Serialize(new
            {
                model = _config["GITHUB_MODEL"],
                messages,
                temperature = 0
            });

            using var httpContent = new StringContent(payload, Encoding.UTF8, "application/json");

            const int maxAttempts = 3;
            for (int attempt = 1; attempt <= maxAttempts; attempt++)
            {
                using var response = await client.PostAsync("chat/completions", httpContent, cancellationToken);
                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Diagnosis API error: {Content}", content);
                    throw new InvalidOperationException("Diagnosis API failed: " + content);
                }

                var result = JsonDocument.Parse(content);

                if (!result.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
                {
                    _logger.LogWarning("No choices returned from model on attempt {Attempt}. Raw: {Raw}", attempt, content);
                    if (attempt == maxAttempts) throw new InvalidOperationException("No choices returned from model");
                    await Task.Delay(500 * attempt, cancellationToken);
                    continue;
                }

                var messageEl = choices[0].GetProperty("message");
                if (!messageEl.TryGetProperty("content", out var contentEl))
                {
                    _logger.LogWarning("No content field in choice on attempt {Attempt}. Raw: {Raw}", attempt, content);
                    if (attempt == maxAttempts) throw new InvalidOperationException("No content in model response");
                    await Task.Delay(500 * attempt, cancellationToken);
                    continue;
                }

                var text = contentEl.GetString() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(text))
                {
                    _logger.LogWarning("Empty content returned from model on attempt {Attempt}. Raw: {Raw}", attempt, content);
                    if (attempt == maxAttempts) throw new InvalidOperationException("Empty response from model");
                    await Task.Delay(500 * attempt, cancellationToken);
                    continue;
                }

                var jsonBlock = ExtractFirstJsonBlock(text) ?? text;
                var cleanedJson = FormattedJson(jsonBlock);

                try
                {
                    using var parsed = JsonDocument.Parse(cleanedJson);
                    var root = parsed.RootElement;

                    // If object contains an array as a property, try to find it
                    if (root.ValueKind == JsonValueKind.Object)
                    {
                        var arrProp = root.EnumerateObject().FirstOrDefault(p => p.Value.ValueKind == JsonValueKind.Array);
                        if (arrProp.Value.ValueKind == JsonValueKind.Array)
                        {
                            root = arrProp.Value;
                        }
                    }

                    List<JsonElement> elements = new List<JsonElement>();
                    if (root.ValueKind == JsonValueKind.Array)
                    {
                        elements.AddRange(root.EnumerateArray());
                    }
                    else if (root.ValueKind == JsonValueKind.Object)
                    {
                        elements.Add(root);
                    }
                    else
                    {
                        _logger.LogWarning("Unexpected JSON root kind in AnalyzeDiagnosis: {Kind}", root.ValueKind);
                        if (attempt == maxAttempts) throw new InvalidOperationException("Unexpected JSON structure from model");
                        await Task.Delay(500 * attempt, cancellationToken);
                        continue;
                    }

                    var list = new List<DiagnosisResponse>();
                    foreach (var el in elements)
                    {
                        var props = el.ValueKind == JsonValueKind.Object
                            ? el.EnumerateObject().ToDictionary(p => p.Name, p => p.Value, StringComparer.OrdinalIgnoreCase)
                            : new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);

                        string GetString(string key)
                        {
                            if (props.TryGetValue(key, out var v))
                            {
                                if (v.ValueKind == JsonValueKind.String) return v.GetString() ?? string.Empty;
                                return v.ToString();
                            }
                            return string.Empty;
                        }

                        double GetDouble(string key)
                        {
                            if (!props.TryGetValue(key, out var v)) return 0.0;
                            if (v.ValueKind == JsonValueKind.Number && v.TryGetDouble(out var d)) return d;
                            if (v.ValueKind == JsonValueKind.String)
                            {
                                var s = v.GetString();
                                if (string.IsNullOrWhiteSpace(s)) return 0.0;
                                s = s.Trim();
                                // remove percent sign
                                s = s.TrimEnd('%');
                                if (double.TryParse(s, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var pd))
                                    return pd;
                            }
                            return 0.0;
                        }

                        var item = new DiagnosisResponse
                        {
                            Label = !string.IsNullOrWhiteSpace(GetString("Label")) ? GetString("Label") : GetString("Name"),
                            Score = GetDouble("Score"),
                            Icd = !string.IsNullOrWhiteSpace(GetString("Icd")) ? GetString("Icd") : GetString("ICD"),
                            Details = GetString("Details"),
                            Physician = GetString("Physician"),
                            Reasoning = GetString("Reasoning")
                        };

                        // filter out entries that are entirely empty
                        if (string.IsNullOrWhiteSpace(item.Label) &&
                            item.Score == 0.0 &&
                            string.IsNullOrWhiteSpace(item.Icd) &&
                            string.IsNullOrWhiteSpace(item.Details) &&
                            string.IsNullOrWhiteSpace(item.Physician))
                        {
                            continue;
                        }

                        list.Add(item);
                    }

                    if (list.Count == 0)
                    {
                        _logger.LogWarning("Parsed list is empty after filtering on attempt {Attempt}. Raw text: {Text}", attempt, text);
                        if (attempt == maxAttempts) throw new InvalidOperationException("Model returned empty conditions");
                        await Task.Delay(500 * attempt, cancellationToken);
                        continue;
                    }

                    return list;
                }
                catch (JsonException jex)
                {
                    _logger.LogError(jex, "Error parsing diagnosis JSON. Raw text: {Text}", text);
                    if (attempt == maxAttempts) throw new InvalidOperationException("Failed to parse diagnosis JSON", jex);
                    await Task.Delay(500 * attempt, cancellationToken);
                    continue;
                }
            }

            // unreachable
            return new List<DiagnosisResponse>();
        }

        public async Task<ConditionDetailResponse?> GetConditionDetailsAsync(string id, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(id)) throw new ArgumentException(nameof(id));

            var client = CreateClient();

            var messages = new[]
            {
                        new
                        {
                            role = "system",
                            content = "You are a medical-assistant AI. Return ONLY a JSON object describing a medical condition."
                        },
                        new
                        {
                            role = "user",
                            content = $@"
        ### Required JSON fields:
        - ""Id"": the condition ID (same as input)
        - ""Name"": the official disease/condition name
        - ""Specialties"": an array of relevant medical specialties
        - ""Description"": 2–4 sentence summary
        - ""CommonCauses"": array of common medical causes
        - ""RedFlags"": array of dangerous symptoms requiring urgent care
        - ""Investigations"": recommended clinical tests
        - ""Disclaimer"": medical safety disclaimer

        ### Now generate JSON for condition ID: ""{id}"".
        Return ONLY JSON. no quote marks inside the json body texts, so the parser doesnt confuse with the formatting."
                        }
                    };

            var payload = JsonSerializer.Serialize(new
            {
                model = _config["GITHUB_MODEL"],
                messages,
                temperature = 0
            });

            using var httpContent = new StringContent(payload, Encoding.UTF8, "application/json");

            using var response = await client.PostAsync("chat/completions", httpContent, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Condition API error: {Content}", content);
                throw new InvalidOperationException("Condition API failed: " + content);
            }

            var result = JsonDocument.Parse(content);
            var text = result.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(text)) return null;

            var jsonBlock = ExtractFirstJsonBlock(text) ?? text;
            var cleanedJson = FormattedJson(jsonBlock);

            // Normalize: if array returned, take first element, else attempt to deserialize object
            using var parsed = JsonDocument.Parse(cleanedJson);
            var root = parsed.RootElement;
            if (root.ValueKind == JsonValueKind.Array)
            {
                if (root.GetArrayLength() == 0) return null;
                root = root[0];
            }

            if (root.ValueKind != JsonValueKind.Object) return null;

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            try
            {
                // Try direct deserialization into the record
                var condition = JsonSerializer.Deserialize<ConditionDetailResponse>(root.GetRawText(), options);
                if (condition != null) return condition;
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Direct deserialization failed, attempting manual mapping");
            }

            // Manual tolerant mapping
            var objProps = root.EnumerateObject().ToDictionary(p => p.Name, p => p.Value, StringComparer.OrdinalIgnoreCase);

            string GetString(string key) =>
                objProps.TryGetValue(key, out var el) && el.ValueKind == JsonValueKind.String ? el.GetString() ?? string.Empty : string.Empty;

            List<string> GetStringList(string key)
            {
                if (!objProps.TryGetValue(key, out var el)) return new List<string>();
                if (el.ValueKind == JsonValueKind.String) return new List<string> { el.GetString() ?? string.Empty };
                if (el.ValueKind == JsonValueKind.Array)
                    return el.EnumerateArray().Select(e => e.ValueKind == JsonValueKind.String ? e.GetString() ?? string.Empty : e.ToString()).ToList();
                return new List<string>();
            }

            return new ConditionDetailResponse
            {
                Id = GetString("Id") ?? GetString("id"),
                Name = GetString("Name") ?? GetString("name"),
                Specialties = GetStringList("Specialties"),
                Description = GetString("Description") ?? GetString("description"),
                CommonCauses = GetStringList("CommonCauses"),
                RedFlags = GetStringList("RedFlags"),
                Investigations = GetStringList("Investigations"),
                Disclaimer = GetString("Disclaimer") ?? GetString("disclaimer")
            };
        }
       


        // ---- helpers ----
        private HttpClient CreateClient()
        {
            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri("https://models.github.ai/inference/");
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _config["GITHUB_TOKEN"]);
            client.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
            return client;
        }

        private object[] BuildChatMessages(SymptomRequest req)
        {
            var previousAnswers = req.Answers ?? new List<FollowUpAnswer>();
            var skipped = req.SkippedQuestions ?? new List<string>();

            var answered = previousAnswers
                .Where(a => !string.IsNullOrWhiteSpace(a.Answer) &&
                            !string.Equals(a.Answer, "Skipped", StringComparison.OrdinalIgnoreCase) &&
                            !string.Equals(a.Answer, "Prefers not to answer", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var askedQuestions = previousAnswers.Select(a => a.Question).ToList();
            if (!askedQuestions.Contains("Please describe your main symptom or concern"))
                askedQuestions.Insert(0, "Please describe your main symptom or concern");

            var forbiddenQuestions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var ans in previousAnswers)
            {
                if (!string.IsNullOrWhiteSpace(ans.Question))
                    forbiddenQuestions.Add(ans.Question);
            }

            foreach (var skip in skipped)
            {
                if (!string.IsNullOrWhiteSpace(skip))
                    forbiddenQuestions.Add(skip);
            }

            var forbiddenList = forbiddenQuestions
                .Select((q, i) => $"{i + 1}. \"{q}\"")
                .ToList();

            var forbiddenText = forbiddenList.Count > 0
                ? string.Join("\n", forbiddenList)
                : "(none)";

            var systemPromptExtra = new StringBuilder();
            systemPromptExtra.AppendLine();
            systemPromptExtra.AppendLine("BEHAVIOR WHEN INITIAL LIMIT REACHED:");
            systemPromptExtra.AppendLine("- Stop after 5 follow-up questions (excluding the initial symptom) unless the caller explicitly requests more.");
            systemPromptExtra.AppendLine("- Do NOT emit control YES/NO or numeric questions; the UI handles that.");
            systemPromptExtra.AppendLine("- When the caller provides requestedAdditionalQuestions = N, ask up to N more clinical follow-ups (do not exceed 15 total in the session).");
            systemPromptExtra.AppendLine("- When the caller sets summaryOnly = true (or requests a summary), return a summary object instead of another question.");
            systemPromptExtra.AppendLine("- Always return strict JSON for clinical questions or summaries only.");

            var systemMessage = new
            {
                role = "system",
                content = $@"
                            You are a medical follow-up assistant for a symptom checker.
                            Your task: ask concise, clinically relevant follow-up questions to clarify the user's reported symptom.

                            VALIDATION RULE (highest priority):
                            - Inspect the user's reported symptom text for medical/symptom content (pain, ache, fever, cough, headache, nausea, dizziness, swelling, shortness of breath, rash, etc.) or clinical phrases.
                            - If the input is detected as non-medical (greeting, joke, personal note, unrelated topic, vague phrase, or empty),
                                DO NOT return an error and DO NOT ask open-ended follow-ups.

                                Instead, attempt recovery by inferring possible intended medical symptoms using:
                                - lexical similarity (keywords, partial matches)
                                - semantic similarity (context, common user phrasing)
                                - common symptom paraphrases

                                Then return a single clarification QUESTION object asking whether the user meant one of the inferred medical symptoms.

                                Rules:
                                - The response MUST be a valid Question object.
                                - Provide at least 2 and at most 5 options.
                                - Options must be concise clinical symptom phrases.
                                - If no reasonable medical interpretations exist, use generic common symptoms as fallbacks.
                                - Do NOT include explanations, apologies, or extra text outside the JSON object.


                            

                            STRICT BEHAVIOR RULES:
                            1. By default stop after 5 follow-ups; if requestedAdditionalQuestions is provided, ask up to that many more (never exceed 15 total).{answered.Count}.
                            2. The following questions have ALREADY been asked OR skipped by the user.
                                You MUST NOT ask ANY of these questions again in ANY form:
                                - NO rephrasing
                                - NO variations
                                - NO similar wording

                                FORBIDDEN LIST:
                                {forbiddenText}
                            3. Skipped questions must NOT be asked again.
                            4. Only ask high-value, symptom-specific clinical questions that meaningfully reduce diagnostic uncertainty and help distinguish between plausible causes of the reported symptom.
                            5. DO NOT ask for age, gender, vitals, or unrelated personal info.
                            6. ALWAYS return strict JSON and nothing else.
                            7. For a follow-up step return exactly one JSON object of type ""question"" OR ""summary"" (when finished).
                            8. Question object schema:
                            {{
                              ""type"": ""question"",
                              ""question"": ""string"",
                              ""options"": [""string"", ""string"", ...]    // REQUIRED for multiple-choice questions (at least 2 options)
                            }}
                            9. Summary object schema:
                            {{
                              ""type"": ""summary"",
                              ""symptom"": ""string"",
                              ""answers"": [ {{ ""question"": ""string"", ""answer"": ""string"" }} ],
                              ""summaryText"": ""short clinical summary""
                            }}

                            11. For multiple-choice, provide concise distinct choices that cover the likely clinical possibilities; include numeric ranges for duration/severity when appropriate (e.g., ""<1 hour"", ""1–24 hours"", "">24 hours"").
                            12. Return a question with an ""options"" array when the information can be captured as multiple choice. Use free-text only if options would be inappropriate.
                            {systemPromptExtra}"
                                        };

                                        var userMessage = new
                                        {
                                            role = "user",
                                            content = $@"
                            User reported symptom: {req.Symptom}

                            askedQuestions: {JsonSerializer.Serialize(askedQuestions)}
                            skippedQuestions: {JsonSerializer.Serialize(skipped)}

                            previousAnswers: {JsonSerializer.Serialize(answered)}

                            Your task: Validate the reported symptom. If non-medical, return the ERROR FORMAT JSON object above. Otherwise, ask ONLY the next symptom-specific follow-up question as a JSON question object with an ""options"" array (multiple-choice). Return ONLY JSON."

            };

            return new[] { systemMessage, userMessage };
        }

        private object[] BuildDiagnosisMessages(DiagnosisRequest req)
        {
            var answersJson = string.Join("\n", req.Answers.Select(a => $"Q: {a.Question}\nA: {a.Answer}"));

            var system = new
            {

                role = "system",
                content = @"
                            You are a clinical diagnostic reasoning engine intended for decision support, not diagnosis.

You receive:
- the user's primary symptom
- a structured Q&A summary
- vitals and demographics

Your task:
Return a ranked list (JSON array) of POSSIBLE medical conditions that could explain the symptom pattern.
These are hypotheses for consideration only, not confirmed diagnoses.

### OUTPUT REQUIREMENTS
- Return ONLY a valid JSON array
- Each item must include:
  - Label: condition name
  - Likelihood: a qualitative likelihood label (""high"", ""moderate"", ""low"")
  - Score: estimated likelihood between 0 and 1 (rounded to two decimals, not diagnostic certainty)
  - Icd: ICD-10 concept code only (e.g., I20, G43 — no subcodes)
  - Details: brief clinical description (concise, neutral)
  - Reasoning: why this condition is being considered based on the provided symptoms
  - Physician: recommended medical specialty
  - IsEmergency: true/false flag for urgent conditions that need immediate attention like cardiac arrest, stroke, sepsis, etc.

### RANKING RULES (CRITICAL)
- Always list potentially life-threatening or high-risk conditions FIRST when symptoms include red flags
- Never place a lower-risk or “stable” condition above a higher-risk alternative
- If multiple conditions are possible, order them by clinical risk priority, not just likelihood score

### SCORING RULES
- Scores represent relative likelihood estimates, NOT diagnostic probability
- Scores must not imply certainty
- High-risk conditions may appear even with moderate or low scores if clinically relevant

### SAFETY RULES
- Do NOT claim a definitive diagnosis
- Do NOT use reassuring language when red-flag symptoms are present
- Do NOT assume age, sex, or medical history unless explicitly provided
- When serious conditions are plausible, include them even if likelihood is uncertain

### FORMAT EXAMPLE (structure only)
[
  {
    ""Label"": ""Condition Name"",
    ""Likelihood"": ""high | moderate | low"",
    ""Score"": 0.65,
    ""Icd"": ""I20"",
    ""Details"": ""Concise clinical description"",
    ""Reasoning"": ""Symptom-based explanation for consideration"",
    ""Physician"": ""Relevant specialty""
    ""IsEmergency"": false
  }
]

Return ONLY the JSON array. No markdown. No explanations outside JSON.

"
            };

            var user = new
            {
                role = "user",
                content = $@"
Symptom: {req.Symptom}


Collected answers:
{answersJson}

Patient info:
Age: {req.Age}
Gender: {req.Gender}
Temperature: {req.Temperature}
Blood Pressure: {req.BloodPressure}
Heart Rate: {req.HeartRate}

Return ONLY the JSON array of conditions.
"
            };

            return new[] { system, user };
        }



        private string FormattedJson(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return input;

            // Prefer the first balanced JSON block if present
            var jsonBlock = ExtractFirstJsonBlock(input) ?? input;

            // Quick attempt: if already valid JSON, return it
            try
            {
                using var _ = JsonDocument.Parse(jsonBlock);
                return jsonBlock;
            }
            catch
            {
                // fall through to attempt repairs
            }

            // Start with the extracted block trimmed
            string working = jsonBlock.Trim();

            // Step A: escape unescaped inner quotes inside JSON string values
            // Heuristic: when inside a JSON string and we see an unescaped '"', look ahead:
            // if the next non-whitespace character is not a JSON delimiter (comma, '}', ']'),
            // treat this quote as an inner-quote and escape it.
            var sb = new StringBuilder(working.Length * 2);
            bool inString = false;
            bool escape = false;

            for (int i = 0; i < working.Length; i++)
            {
                char ch = working[i];

                if (escape)
                {
                    sb.Append(ch);
                    escape = false;
                    continue;
                }

                if (ch == '\\')
                {
                    sb.Append(ch);
                    escape = true;
                    continue;
                }

                if (ch == '"')
                {
                    if (!inString)
                    {
                        // opening quote
                        inString = true;
                        sb.Append(ch);
                    }
                    else
                    {
                        // candidate closing or inner quote. Look ahead for next non-whitespace char
                        int j = i + 1;
                        while (j < working.Length && char.IsWhiteSpace(working[j])) j++;
                        char next = j < working.Length ? working[j] : '\0';

                        // if next is one of JSON structural delimiters, treat as closing quote
                        if (next == ',' || next == '}' || next == ']' || next == '\0')
                        {
                            inString = false;
                            sb.Append('"');
                        }
                        else
                        {
                            // likely an inner unescaped quote (e.g. ... called "mono" or ...)
                            // escape it and remain inside the string
                            sb.Append("\\\"");
                        }
                    }
                    continue;
                }

                sb.Append(ch);
            }

            working = sb.ToString();

            // Step B: do conservative repairs already present:
            // 1) Remove trailing commas before } or ]
            working = Regex.Replace(working, @",\s*(?=[}\]])", "");

            // 2) Ensure property names are quoted: convert { key:  to { "key":
            working = Regex.Replace(
                working,
                @"(?<=[{,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:",
                m => $"\"{m.Groups[1].Value}\":"
            );

            // 3) Quote simple unquoted array elements
            var arrayRegex = new Regex(@"\[([^\[\]]*?)\]");
            working = arrayRegex.Replace(working, match =>
            {
                string content = match.Groups[1].Value;

                // Split by comma but ignore commas inside quotes
                var parts = Regex.Matches(content, @"(?<=^|,)\s*((""[^""]*""|[^,""]+))\s*(?=,|$)")
                                 .Cast<Match>()
                                 .Select(m => m.Groups[1].Value.Trim())
                                 .Select(s =>
                                 {
                                     // If already quoted or looks like an object/array/number/boolean/null, leave as-is
                                     if (s.StartsWith("\"") && s.EndsWith("\"")) return s;
                                     if (s.StartsWith("{") || s.StartsWith("[") ||
                                         Regex.IsMatch(s, @"^(true|false|null|\d+(\.\d+)?)$", RegexOptions.IgnoreCase))
                                         return s;
                                     // Wrap likely unquoted strings in quotes, escaping internal quotes
                                     var escaped = s.Replace("\"", "\\\"");
                                     return $"\"{escaped}\"";
                                 });

                return "[" + string.Join(",", parts) + "]";
            });

            // Final validation attempt: only return repaired JSON when it parses
            try
            {
                using var _ = JsonDocument.Parse(working);
                return working;
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "FormattedJson: repair attempt failed; returning original extracted block");
                // fallback to original extracted jsonBlock (minimal risk)
                return jsonBlock;
            }
        }

        private string? ExtractFirstJsonBlock(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return null;

            int n = input.Length;
            for (int start = 0; start < n; start++)
            {
                char c = input[start];
                if (c != '{' && c != '[') continue;

                var stack = new Stack<char>();
                bool inString = false;
                bool escape = false;

                for (int i = start; i < n; i++)
                {
                    char ch = input[i];

                    if (escape)
                    {
                        escape = false;
                        continue;
                    }

                    if (ch == '\\')
                    {
                        escape = true;
                        continue;
                    }

                    if (ch == '"')
                    {
                        inString = !inString;
                        continue;
                    }

                    if (inString) continue;

                    if (ch == '{' || ch == '[')
                    {
                        stack.Push(ch);
                    }
                    else if (ch == '}' || ch == ']')
                    {
                        if (stack.Count == 0) break;
                        char opening = stack.Pop();
                        if ((opening == '{' && ch != '}') || (opening == '[' && ch != ']'))
                        {
                            stack.Clear();
                            break;
                        }
                        if (stack.Count == 0)
                        {
                            return input.Substring(start, i - start + 1);
                        }
                    }
                }
            }

            return null;
        }

        /// <summary>
        /// Checks if the input string is a valid JSON object or array.
        /// </summary>
        private bool IsValidJson(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return false;
            input = input.Trim();
            if (!(input.StartsWith("{") || input.StartsWith("["))) return false;
            try
            {
                using var _ = JsonDocument.Parse(input);
                return true;
            }
            catch (JsonException)
            {
                return false;
            }
        }
    }
}
