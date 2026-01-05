using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Prescription.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class sqldatamigrate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "advices",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_advices", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "chief_complaints",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_chief_complaints", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "diseases",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    source_id = table.Column<int>(type: "int", nullable: false),
                    shortcut = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_diseases", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "drugs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    name = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    form = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    brand_name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    strength = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_drugs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "examinations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_examinations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reports",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    oid = table.Column<int>(type: "int", nullable: false),
                    abbreviation = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    full_name = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    default_value = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    normal_range = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    cost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reports", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "symptoms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    source_id = table.Column<int>(type: "int", nullable: false),
                    shortcut = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    name = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    follow_up = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_symptoms", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "disease_drugs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    disease_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    drug_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    dosage_instructions = table.Column<string>(type: "text", nullable: true),
                    dosage_instructions_english = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_disease_drugs", x => x.id);
                    table.ForeignKey(
                        name: "fk_disease_drugs_diseases_disease_id",
                        column: x => x.disease_id,
                        principalTable: "diseases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_disease_drugs_drugs_drug_id",
                        column: x => x.drug_id,
                        principalTable: "drugs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "symptom_advices",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    symptom_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    advice_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_symptom_advices", x => x.id);
                    table.ForeignKey(
                        name: "fk_symptom_advices_advices_advice_id",
                        column: x => x.advice_id,
                        principalTable: "advices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_symptom_advices_symptoms_symptom_id",
                        column: x => x.symptom_id,
                        principalTable: "symptoms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "symptom_chief_complaints",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    symptom_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    chief_complaint_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_symptom_chief_complaints", x => x.id);
                    table.ForeignKey(
                        name: "fk_symptom_chief_complaints_chief_complaints_chief_complaint_id",
                        column: x => x.chief_complaint_id,
                        principalTable: "chief_complaints",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_symptom_chief_complaints_symptoms_symptom_id",
                        column: x => x.symptom_id,
                        principalTable: "symptoms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "symptom_drugs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    symptom_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    drug_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    dosage_instructions = table.Column<string>(type: "text", nullable: true),
                    dosage_instructions_english = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_symptom_drugs", x => x.id);
                    table.ForeignKey(
                        name: "fk_symptom_drugs_drugs_drug_id",
                        column: x => x.drug_id,
                        principalTable: "drugs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_symptom_drugs_symptoms_symptom_id",
                        column: x => x.symptom_id,
                        principalTable: "symptoms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "symptom_examinations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    symptom_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    examination_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_symptom_examinations", x => x.id);
                    table.ForeignKey(
                        name: "fk_symptom_examinations_examinations_examination_id",
                        column: x => x.examination_id,
                        principalTable: "examinations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_symptom_examinations_symptoms_symptom_id",
                        column: x => x.symptom_id,
                        principalTable: "symptoms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "symptom_investigations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    symptom_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    report_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_symptom_investigations", x => x.id);
                    table.ForeignKey(
                        name: "fk_symptom_investigations_reports_report_id",
                        column: x => x.report_id,
                        principalTable: "reports",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_symptom_investigations_symptoms_symptom_id",
                        column: x => x.symptom_id,
                        principalTable: "symptoms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_disease_drugs_disease_id_drug_id",
                table: "disease_drugs",
                columns: new[] { "disease_id", "drug_id" });

            migrationBuilder.CreateIndex(
                name: "ix_disease_drugs_drug_id",
                table: "disease_drugs",
                column: "drug_id");

            migrationBuilder.CreateIndex(
                name: "ix_diseases_shortcut",
                table: "diseases",
                column: "shortcut",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_diseases_source_id",
                table: "diseases",
                column: "source_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_drugs_name",
                table: "drugs",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "ix_reports_abbreviation",
                table: "reports",
                column: "abbreviation");

            migrationBuilder.CreateIndex(
                name: "ix_reports_oid",
                table: "reports",
                column: "oid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_symptom_advices_advice_id",
                table: "symptom_advices",
                column: "advice_id");

            migrationBuilder.CreateIndex(
                name: "ix_symptom_advices_symptom_id_advice_id",
                table: "symptom_advices",
                columns: new[] { "symptom_id", "advice_id" });

            migrationBuilder.CreateIndex(
                name: "ix_symptom_chief_complaints_chief_complaint_id",
                table: "symptom_chief_complaints",
                column: "chief_complaint_id");

            migrationBuilder.CreateIndex(
                name: "ix_symptom_chief_complaints_symptom_id_chief_complaint_id",
                table: "symptom_chief_complaints",
                columns: new[] { "symptom_id", "chief_complaint_id" });

            migrationBuilder.CreateIndex(
                name: "ix_symptom_drugs_drug_id",
                table: "symptom_drugs",
                column: "drug_id");

            migrationBuilder.CreateIndex(
                name: "ix_symptom_drugs_symptom_id_drug_id",
                table: "symptom_drugs",
                columns: new[] { "symptom_id", "drug_id" });

            migrationBuilder.CreateIndex(
                name: "ix_symptom_examinations_examination_id",
                table: "symptom_examinations",
                column: "examination_id");

            migrationBuilder.CreateIndex(
                name: "ix_symptom_examinations_symptom_id_examination_id",
                table: "symptom_examinations",
                columns: new[] { "symptom_id", "examination_id" });

            migrationBuilder.CreateIndex(
                name: "ix_symptom_investigations_report_id",
                table: "symptom_investigations",
                column: "report_id");

            migrationBuilder.CreateIndex(
                name: "ix_symptom_investigations_symptom_id_report_id",
                table: "symptom_investigations",
                columns: new[] { "symptom_id", "report_id" });

            migrationBuilder.CreateIndex(
                name: "ix_symptoms_shortcut",
                table: "symptoms",
                column: "shortcut",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_symptoms_source_id",
                table: "symptoms",
                column: "source_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "disease_drugs");

            migrationBuilder.DropTable(
                name: "symptom_advices");

            migrationBuilder.DropTable(
                name: "symptom_chief_complaints");

            migrationBuilder.DropTable(
                name: "symptom_drugs");

            migrationBuilder.DropTable(
                name: "symptom_examinations");

            migrationBuilder.DropTable(
                name: "symptom_investigations");

            migrationBuilder.DropTable(
                name: "diseases");

            migrationBuilder.DropTable(
                name: "advices");

            migrationBuilder.DropTable(
                name: "chief_complaints");

            migrationBuilder.DropTable(
                name: "drugs");

            migrationBuilder.DropTable(
                name: "examinations");

            migrationBuilder.DropTable(
                name: "reports");

            migrationBuilder.DropTable(
                name: "symptoms");
        }
    }
}
