import { describe, expect, it } from "vitest";
import { defaultAutomationConfig } from "../src/lib/liveSnapshot";
import { mapNotionResults } from "../netlify/functions/shared";

describe("mapNotionResults", () => {
  it("maps Notion-style properties into dashboard context items", () => {
    const items = mapNotionResults(
      [
        {
          id: "page-1",
          properties: {
            Title: {
              type: "title",
              title: [{ plain_text: "Margin rule" }]
            },
            Category: {
              type: "select",
              select: { name: "Alerts" }
            },
            Priority: {
              type: "status",
              status: { name: "High" }
            },
            Notes: {
              type: "rich_text",
              rich_text: [{ plain_text: "Call out margin under 40%." }]
            }
          }
        }
      ],
      defaultAutomationConfig
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Margin rule",
      category: "Alerts",
      priority: "High",
      notes: "Call out margin under 40%."
    });
  });
});
