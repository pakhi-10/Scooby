// Generates club-info data (+ logos) from static/data/Recruitment_Forms.xlsx.
//
// The workbook stores club logos as floating images anchored to cells, which
// SheetJS cannot read as cell values. So we unzip the .xlsx, walk the
// worksheet -> drawing -> media relationships, and map each logo image to its
// club by anchor row. Text columns (name / details / instagram) come from
// SheetJS as usual.
//
// Output:
//   static/club-logos/<category>/<slug>.<ext>   (extracted logos)
//   src/lib/data/clubs.json                      (bundled club data)
//
// Re-run whenever the workbook changes:  npm run gen:clubs

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const XLSX_PATH = path.join(ROOT, "static/data/Recruitment_Forms.xlsx");
const LOGO_DIR = path.join(ROOT, "static/club-logos");
const JSON_OUT = path.join(ROOT, "src/lib/data/clubs.json");

// Sheet name -> output category. Header is row 2, entries start at row 3.
const TARGETS = [
	{ sheet: "Cultural Club Details", category: "cultural" },
	{ sheet: "Technical Club Details", category: "technical" },
];

// Columns (0-based, relative to the sheet's used range which begins at col B).
// B=name, C=logo, D=details, E=instagram, F=email.
const COL = { name: 0, details: 2, instagram: 3, email: 4 };
const HEADER_ROW = 1; // row 2
const FIRST_DATA_ROW = 2; // row 3

const readText = (p) => fs.readFileSync(p, "utf8");

function relMap(relsXml) {
	const map = {};
	const re = /Id="([^"]+)"[^>]*?Target="([^"]+)"/g;
	let m;
	while ((m = re.exec(relsXml))) map[m[1]] = m[2];
	return map;
}

// Resolve which drawingN.xml backs a given worksheet, via the OOXML rel chain:
// workbook.xml(name -> r:id) -> workbook.xml.rels(r:id -> sheetN.xml)
//   -> sheetN.xml(<drawing r:id>) -> sheetN.xml.rels(r:id -> drawingM.xml)
function resolveDrawing(dir, sheetName) {
	const wbRels = relMap(readText(path.join(dir, "xl/_rels/workbook.xml.rels")));
	const wb = readText(path.join(dir, "xl/workbook.xml"));
	const sheetTag = new RegExp(`<sheet[^>]*name="${sheetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*r:id="([^"]+)"`).exec(wb);
	if (!sheetTag) throw new Error(`Sheet not found in workbook: ${sheetName}`);
	const sheetTarget = wbRels[sheetTag[1]]; // e.g. worksheets/sheet2.xml
	const sheetFile = path.join(dir, "xl", sheetTarget);
	const sheetBase = path.basename(sheetTarget);
	const sheetRelsPath = path.join(path.dirname(sheetFile), "_rels", `${sheetBase}.rels`);

	const sheetRels = relMap(readText(sheetRelsPath));
	const drawTag = /<drawing[^>]*r:id="([^"]+)"/.exec(readText(sheetFile));
	if (!drawTag) return null; // sheet has no drawing
	const drawTarget = sheetRels[drawTag[1]]; // ../drawings/drawingM.xml
	const drawFile = path.normalize(path.join(path.dirname(sheetFile), drawTarget));
	return drawFile;
}

// Map data-row-index -> media file path, by parsing the drawing's anchors.
function rowToImage(dir, drawFile) {
	const xml = readText(drawFile);
	const rels = relMap(readText(path.join(path.dirname(drawFile), "_rels", `${path.basename(drawFile)}.rels`)));
	const anchors = xml.match(/<xdr:(?:one|two)CellAnchor[\s\S]*?<\/xdr:(?:one|two)CellAnchor>/g) || [];
	const map = new Map();
	for (const a of anchors) {
		const row = /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/.exec(a);
		const embed = /r:embed="([^"]+)"/.exec(a);
		if (!row || !embed) continue;
		const target = rels[embed[1]];
		if (!target) continue;
		const media = path.normalize(path.join(path.dirname(drawFile), target));
		map.set(Number(row[1]), media);
	}
	return map;
}

function slugify(name) {
	return name
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function handleFromInstagram(url) {
	if (!url) return "";
	const m = /instagram\.com\/([^/?#]+)/i.exec(url);
	return m ? `@${m[1]}` : "";
}

function main() {
	if (!fs.existsSync(XLSX_PATH)) {
		console.error(`Workbook not found: ${XLSX_PATH}`);
		process.exit(1);
	}

	// Extract the xlsx (a zip) to a temp dir so we can read drawings + media.
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clubs-"));
	execSync(`unzip -oq "${XLSX_PATH}" -d "${tmp}"`);

	// Reset logo output dir.
	fs.rmSync(LOGO_DIR, { recursive: true, force: true });

	const wb = XLSX.readFile(XLSX_PATH);
	const clubs = [];

	for (const { sheet, category } of TARGETS) {
		const ws = wb.Sheets[sheet];
		if (!ws) {
			console.warn(`Skipping missing sheet: ${sheet}`);
			continue;
		}
		// Keep every row (no blankrows:false) so array indices stay aligned
		// with absolute sheet rows. The used range may not start at row 1, so
		// offset by range.s.r to get the true row for each entry.
		const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
		const startRow = XLSX.utils.decode_range(ws["!ref"]).s.r;

		const drawFile = resolveDrawing(tmp, sheet);
		const imgMap = drawFile ? rowToImage(tmp, drawFile) : new Map();

		fs.mkdirSync(path.join(LOGO_DIR, category), { recursive: true });
		const usedSlugs = new Map();
		let count = 0;

		for (let i = 0; i < rows.length; i++) {
			const absRow = startRow + i; // 0-based absolute sheet row
			if (absRow < FIRST_DATA_ROW) continue;
			const row = rows[i] || [];
			const name = (row[COL.name] ?? "").toString().trim();
			if (!name) continue;

			const details = (row[COL.details] ?? "").toString().trim();
			const instagram = (row[COL.instagram] ?? "").toString().trim();
			const email = (row[COL.email] ?? "").toString().trim();

			// Base slug, de-duplicated.
			let slug = slugify(name) || `club-${absRow}`;
			const n = (usedSlugs.get(slug) ?? 0) + 1;
			usedSlugs.set(slug, n);
			if (n > 1) slug = `${slug}-${n}`;

			// Copy logo if one is anchored to this row.
			let logo = "";
			const media = imgMap.get(absRow);
			if (media && fs.existsSync(media)) {
				const ext = path.extname(media).toLowerCase() || ".png";
				const fileName = `${slug}${ext}`;
				fs.copyFileSync(media, path.join(LOGO_DIR, category, fileName));
				logo = `/club-logos/${category}/${fileName}`;
			}

			clubs.push({
				name,
				details,
				instagram,
				handle: handleFromInstagram(instagram),
				email,
				logo,
				category,
			});
			count++;
		}
		console.log(`${sheet}: ${count} clubs, ${[...imgMap.keys()].length} logos found`);
	}

	fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
	fs.writeFileSync(JSON_OUT, JSON.stringify(clubs, null, "\t") + "\n");
	fs.rmSync(tmp, { recursive: true, force: true });

	const withLogo = clubs.filter((c) => c.logo).length;
	console.log(`\nWrote ${clubs.length} clubs (${withLogo} with logos) -> ${path.relative(ROOT, JSON_OUT)}`);
}

main();
