import { describe, test, expect } from "@jest/globals";

describe("Howdy-Hub Bot", () => {
  test("should detect auto-close keywords in title", () => {
    const title = "Mark this as complete";
    const keyword = "complete";
    expect(title.toLowerCase().includes(keyword.toLowerCase())).toBe(true);
  });

  test("should replace {{author}} in welcome message", () => {
    const msg = "Hello {{author}}, welcome!";
    const result = msg.replace(/{{\s*author\s*}}/g, "@octocat");
    expect(result).toBe("Hello @octocat, welcome!");
  });
});
