import { createTool } from "@mastra/core/tools";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { z } from "zod";

export {
  searchCompanies as ycSearchTool,
  getCompanyBySlug as ycDetailTool,
} from "@mastra/yc-hn-tools";

const YC_BASE_URL = "https://api.ycombinator.com/v0.1";

// fetch-all tool (paginated) 
export const ycFetchAllTool = createTool({
  id: "yc-fetch-all",
  description:
    "Fetch ALL YC companies matching a query/filter by automatically looping through every page. Use this instead of ycSearchTool when the user wants a large or complete dataset.",

  // Input schema : format of input accepted by the tool
  inputSchema: z.object({
    query: z.string().optional().describe("Search keyword, country, industry, etc."),
    batch: z.string().optional().describe("YC batch e.g. W24, S23"),
    status: z.string().optional().describe("active | inactive | acquired"),
    maxPages: z
      .number()
      .optional()
      .default(10)
      .describe("Max pages to fetch (each page = 20 companies). Default 10 → up to 200 companies."),
  }),

  // Output schema : format of output returned by the tool
  outputSchema: z.object({
    companies: z.array(z.any()),
    totalFetched: z.number(),
    pagesScanned: z.number(),
  }),

  execute: async ({ query, batch, status, maxPages = 10 }) => {
    const allCompanies: any[] = [];
    let page = 0;
    let totalPages = 1;

    while (page < totalPages && page < maxPages) {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (batch) params.append("batch", batch);
      if (status) params.append("status", status);
      params.append("page", String(page));

      const res = await fetch(`${YC_BASE_URL}/companies?${params.toString()}`);
      if (!res.ok) throw new Error(`YC API error: ${res.statusText}`);

      const data = await res.json();
      allCompanies.push(...(data.companies ?? []));
      totalPages = data.totalPages ?? 1;
      page++;
    }

    return {
      companies: allCompanies,
      totalFetched: allCompanies.length,
      pagesScanned: page,
    };
  },
});

// fetch-all + export in one shot 
export const ycFetchAndExportTool = createTool({
  id: "yc-fetch-and-export",
  description:
    "Fetch ALL YC companies matching a query and immediately save them to an Excel file. Use this whenever the user asks to export, download, or save results to a file.",
  inputSchema: z.object({
    query: z.string().optional().describe("Search keyword, country, industry, etc."),
    batch: z.string().optional().describe("YC batch e.g. W24, S23"),
    status: z.string().optional().describe("active | inactive | acquired"),
    maxPages: z.number().optional().default(10).describe("Max pages to fetch (each page = 20 companies). Default 10."),
    filename: z.string().optional().describe('Output filename without extension, e.g. "yc-india-companies".'),
  }),
  outputSchema: z.object({
    filePath: z.string(),
    rowCount: z.number(),
    message: z.string(),
  }),
  execute: async ({ query, batch, status, maxPages = 10, filename }) => {
    // 1. fetch all pages
    const allCompanies: any[] = [];
    let page = 0;
    let totalPages = 1;

    while (page < totalPages && page < maxPages) {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (batch) params.append("batch", batch);
      if (status) params.append("status", status);
      params.append("page", String(page));

      const res = await fetch(`${YC_BASE_URL}/companies?${params.toString()}`);
      if (!res.ok) throw new Error(`YC API error: ${res.statusText}`);

      const data = await res.json();
      allCompanies.push(...(data.companies ?? []));
      totalPages = data.totalPages ?? 1;
      page++;
    }

    // 2. write to Excel
    const outputDir = path.resolve(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const safeFilename = filename
      ? filename.replace(/[^a-z0-9_\-]/gi, "_")
      : `yc-companies-${timestamp}`;
    const filePath = path.join(outputDir, `${safeFilename}.xlsx`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "YC Job Hunter Agent";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("YC Companies", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Company",    key: "name",       width: 28 },
      { header: "One-liner",  key: "oneLiner",   width: 50 },
      { header: "Batch",      key: "batch",      width: 10 },
      { header: "Status",     key: "status",     width: 12 },
      { header: "Team Size",  key: "teamSize",   width: 12 },
      { header: "Website",    key: "website",    width: 35 },
      { header: "Tags",       key: "tags",       width: 40 },
      { header: "Industries", key: "industries", width: 30 },
      { header: "Location",   key: "locations",  width: 30 },
      { header: "Regions",    key: "regions",    width: 35 },
      { header: "YC Profile", key: "url",        width: 45 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };
      cell.font = { bold: true };
    });

    allCompanies.forEach((company: any) => {
      sheet.addRow({
        name:       company.name ?? "",
        oneLiner:   company.oneLiner ?? "",
        batch:      company.batch ?? "",
        status:     company.status ?? "",
        teamSize:   company.teamSize ?? "",
        website:    company.website ?? "",
        tags:       (company.tags ?? []).join(", "),
        industries: (company.industries ?? []).join(", "),
        locations:  (company.locations ?? []).join(", "),
        regions:    (company.regions ?? []).join(", "),
        url:        company.url ?? "",
      });
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: sheet.columns.length },
    };

    await workbook.xlsx.writeFile(filePath);

    return {
      filePath,
      rowCount: allCompanies.length,
      message: `✅ Exported ${allCompanies.length} companies to ${filePath}`,
    };
  },
});

const companySchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  oneLiner: z.string().optional(),
  batch: z.string().optional(),
  status: z.string().optional(),
  website: z.string().optional(),
  url: z.string().optional(),
  teamSize: z.number().optional(),
  tags: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
});

export const exportToExcelTool = createTool({
  id: "export-to-excel",
  description:
    "Save a list of YC companies to a formatted Excel (.xlsx) file. Call this when the user asks to export, save, or download the results.",
  inputSchema: z.object({
    companies: z
      .array(companySchema)
      .describe("Array of YC company objects to export"),
    filename: z
      .string()
      .optional()
      .describe(
        'Output filename without extension, e.g. "yc-fintech-w24". Defaults to a timestamped name.',
      ),
  }),
  outputSchema: z.object({
    filePath: z.string(),
    rowCount: z.number(),
    message: z.string(),
  }),
  execute: async (inputData) => {
    const { companies, filename } = inputData;

    // Resolve output directory: <project-root>/output/
    const outputDir = path.resolve(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const safeFilename = filename
      ? filename.replace(/[^a-z0-9_\-]/gi, "_")
      : `yc-companies-${timestamp}`;
    const filePath = path.join(outputDir, `${safeFilename}.xlsx`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "YC Job Hunter Agent";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("YC Companies", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    // Column definitions 
    sheet.columns = [
      { header: "Company", key: "name", width: 28 },
      { header: "One-liner", key: "oneLiner", width: 50 },
      { header: "Batch", key: "batch", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "Team Size", key: "teamSize", width: 12 },
      { header: "Website", key: "website", width: 35 },
      { header: "Tags", key: "tags", width: 40 },
      { header: "Industries", key: "industries", width: 30 },
      { header: "Location", key: "locations", width: 30 },
      { header: "Regions", key: "regions", width: 35 },
      { header: "YC Profile", key: "url", width: 45 },
    ];

    // Header row styling
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };
      cell.font = { bold: true };
    });

    // Data rows
    companies.forEach((company: z.infer<typeof companySchema>) => {
      sheet.addRow({
        name: company.name ?? "",
        oneLiner: company.oneLiner ?? "",
        batch: company.batch ?? "",
        status: company.status ?? "",
        teamSize: company.teamSize ?? "",
        website: company.website ?? "",
        tags: (company.tags ?? []).join(", "),
        industries: (company.industries ?? []).join(", "),
        locations: (company.locations ?? []).join(", "),
        regions: (company.regions ?? []).join(", "),
        url: company.url ?? "",
      });
    });

    // Auto-filter on header row 
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    await workbook.xlsx.writeFile(filePath);

    return {
      filePath,
      rowCount: companies.length,
      message: `✅ Exported ${companies.length} companies to ${filePath}`,
    };
  },
});
