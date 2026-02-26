import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

import { OrganizationSelector } from "./organization-selector";

describe("OrganizationSelector", () => {
  it("renders organization name without trailing uuid", () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizationSelector, {
        organizations: [
          {
            id: "o1",
            name: "Default org c879f48e-2aaa-43e0-821f-4f3f28b95388",
            role: "owner"
          }
        ],
        selectedOrganizationId: "o1",
        basePath: "/events"
      })
    );

    expect(html).toContain("Default org");
    expect(html).not.toContain("c879f48e-2aaa-43e0-821f-4f3f28b95388");
  });
});
