import * as cheerio from "cheerio";

export interface GymClass {
  id: string;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  openings: number;
  tuition: number;
  status: "register" | "waitlist";
  registerUrl: string;
}

export function extractClasses(tableHtml: string): GymClass[] {
  const $ = cheerio.load(tableHtml);

  const classes: GymClass[] = [];

  $("tbody > tr").each((_, row) => {
    const registerCell = $(row).find("td").eq(0);
    const classCell = $(row).find("th");
    const dayCell = $(row).find("td").eq(1);
    const timeCell = $(row).find("td").eq(2);
    const openingsCell = $(row).find("td").eq(3);
    const tuitionCell = $(row).find("td").eq(4);

    const registerLink = registerCell.find("a");

    const registerUrl = registerLink.attr("href") ?? "";
    const registerText = registerLink.text().trim().toLowerCase();

    // Pull the Jackrabbit class ID from the URL
    const id = new URL(registerUrl).searchParams.get("preLoadClassID") ?? "";

    const [startTime, endTime] = timeCell
      .text()
      .trim()
      .split(/\s*-\s*/);

    classes.push({
      id,
      name: classCell.text().trim(),
      day: dayCell.text().trim(),
      ...{startTime: startTime ?? ""},
      ...{endTime: endTime ?? ""},
      openings: Number(openingsCell.text().trim()),
      tuition: Number(tuitionCell.text().trim()),
      status: registerText === "waitlist" ? "waitlist" : "register",
      registerUrl,
    });
  });

  return classes;
}