export function desirableMarkdownRow(input: {
  assignedDId: string;
  area: string;
  wish: string;
  why: string;
  heardFrom: string;
  visual?: string;
}): string {
  const date = new Date().toISOString().slice(0, 10);
  const visual = input.visual?.trim() ? input.visual.trim() : "—";
  return `| ${input.assignedDId} | idea | ${date} | ${input.area} | ${input.wish.replace(/\|/g, "\\|")} | ${input.why.replace(/\|/g, "\\|")} | ${visual} | ${input.heardFrom.replace(/\|/g, "\\|")} |`;
}
