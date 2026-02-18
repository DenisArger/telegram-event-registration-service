import { describe, expect, it } from "vitest";
import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders html/body wrapper", () => {
    const node = RootLayout({ children: "child" as any });

    expect(node.type).toBe("html");
    expect(node.props.lang).toBe("en");
  });
});
