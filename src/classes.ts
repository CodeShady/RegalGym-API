import * as cheerio from "cheerio";

export interface GymClass {
  name: string;
  description: string;
  day: string;
  startTime: string;
  endTime: string;
  gender: string;
  ages: string;
  openings: number;
  classStarts: string;
  classEnds: string;
  session: string;
  tuition: number;
  status: "register" | "waitlist";
  registerUrl: string;
}

export function extractClasses(tableHtml: string): GymClass[] {
  const $ = cheerio.load(tableHtml);

  const classes: GymClass[] = [];

  $("tbody > tr").each((_, row) => {
    const getCell = (title: string): string =>
      $(row)
        .find(`[data-title="${title}"]`)
        .first()
        .text()
        .replace(/\u00a0/g, "")
        .trim();

    const registerCell = $(row).find('[data-title="Register"]').first();
    const registerLink = registerCell.find("a").first();

    const registerUrl = registerLink.attr("href") ?? "";
    const registerText = registerLink.text().trim().toLowerCase();

    const times = getCell("Times");
    const [startTime = "", endTime = ""] = times.split(/\s*-\s*/);

    const openingsText = getCell("Openings");
    const tuitionText = getCell("Tuition");

    classes.push({
      name: getCell("Class"),
      description: getCell("Description"),
      day: getCell("Days"),
      startTime,
      endTime,
      gender: getCell("Gender"),
      ages: getCell("Ages"),
      openings: Number(openingsText) || 0,
      classStarts: getCell("Class Starts"),
      classEnds: getCell("Class Ends"),
      session: getCell("Session"),
      tuition: Number(tuitionText) || 0,
      status: registerText === "waitlist" ? "waitlist" : "register",
      registerUrl,
    });
  });

  return classes;
}