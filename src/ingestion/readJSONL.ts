import fs from "fs";
import path from "path";

export function readFolderJSONL(folderPath: string) {
  let data: any[] = [];

  try {
    const files = fs.readdirSync(folderPath);
    console.log(`   Reading ${files.length} files from ${folderPath}...`);

    for (const file of files) {
      const fullPath = path.join(folderPath, file);
      
      try {
        const lines = fs.readFileSync(fullPath, "utf-8").split("\n");
        let errorCount = 0;

        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines
          
          try {
            const parsed = JSON.parse(line);
            data.push(parsed);
          } catch (parseError) {
            errorCount++;
            if (errorCount <= 3) { // Only log first 3 errors per file
              console.warn(`   ⚠️  Parse error in ${file}: ${(parseError as Error).message.substring(0, 50)}`);
            }
          }
        }

        if (errorCount > 3) {
          console.warn(`   ⚠️  ... and ${errorCount - 3} more parse errors in ${file}`);
        }
      } catch (readError) {
        console.error(`   ❌ Error reading file ${file}:`, (readError as Error).message);
      }
    }

    console.log(`   ✓ Parsed ${data.length} records from ${folderPath}`);
    return data;
  } catch (error) {
    console.error(`❌ Error reading folder ${folderPath}:`, (error as Error).message);
    return [];
  }
}