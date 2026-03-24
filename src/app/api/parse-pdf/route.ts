import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { db, shifts } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Convert Web File to Node Buffer for pdf-parse
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Parse the PDF
        const parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        const lines = textResult.text.split("\n");

        // DEBUG: Save the text to a file to analyze the lines
        try {
            const tmpPath = path.join(process.cwd(), "pdf-output.txt");
            fs.writeFileSync(tmpPath, textResult.text);
        } catch (e) {
            console.error("Failed to write debug file", e);
        }

        // 2. Extract the records
        type ParsedRecord = {
            date: string;
            day: string;
            shift: string;
            start_time: string;
            end_time: string;
            attendance: string;
            duty: string;
            comment: string;
        };
        const parsedRecords = lines
            .map((line: string): ParsedRecord | null => {
                // Your specific regex extraction logic goes here
                const match = line.match(
                    /(\d{2}\/\d{2}\/\d{4})\s+(\w+)\s+([\d\w\s-]+)\s+(\d{4})\s+(\d{4})\s+(.+?)\s+(.+?)\s+(.*)/
                );
                if (match) {
                    return {
                        date: match[1],
                        day: match[2],
                        shift: match[3].trim(),
                        start_time: match[4],
                        end_time: match[5],
                        attendance: match[6].trim(),
                        duty: match[7].trim(),
                        comment: match[8].trim(),
                    };
                }
                return null;
            })
            .filter((record: ParsedRecord | null): record is ParsedRecord => record !== null);

        // 3. Save to Neon Postgres using Drizzle ORM
        if (parsedRecords.length > 0) {
            // Map parsed records to Drizzle schema format (camelCasified keys for DB, depending on your schema)
            const insertData = parsedRecords.map((record: ParsedRecord) => ({
                date: record!.date,
                day: record!.day,
                shift: record!.shift,
                startTime: record!.start_time,
                endTime: record!.end_time,
                attendance: record!.attendance,
                duty: record!.duty,
                comment: record!.comment,
            }));

            await db.insert(shifts).values(insertData);
        }

        return NextResponse.json({
            success: true,
            count: parsedRecords.length,
            records: parsedRecords,
        });
    } catch (error) {
        console.error("Error parsing PDF:", error);
        return NextResponse.json(
            { error: "Error parsing PDF" },
            { status: 500 }
        );
    }
}
