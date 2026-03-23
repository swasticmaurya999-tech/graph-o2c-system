import fs from "fs";
import path from "path";

export function readFolderJSONL(folderPath: string) {
  const files = fs.readdirSync(folderPath);

  let data: any[] = [];

  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const lines = fs.readFileSync(fullPath, "utf-8").split("\n");

    const parsed = lines
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    data = data.concat(parsed);
  }

  return data;
}