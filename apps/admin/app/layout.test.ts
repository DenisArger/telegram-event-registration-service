import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout from "./layout";

vi.mock("./_components/admin-header", () => ({
  AdminHeader: () => "header"
}));

describe("RootLayout", () => {
  it("renders html/body wrapper with header and content container", () => {
    const node = RootLayout({ children: "child" as any });
    const html = renderToStaticMarkup(node as any);

    expect(node.type).toBe("html");
    expect(node.props.lang).toBe("en");
    expect(html).toContain("header");
    expect(html).toContain("child");
  });
});
