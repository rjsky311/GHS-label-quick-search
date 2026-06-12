import { render, screen } from "@testing-library/react";
import { AlertTriangle, Search } from "lucide-react";
import { Button, buttonVariants } from "../button";

describe("Button notebook variants", () => {
  it("renders notebook primary as a paper-tab action instead of a solid blue block", () => {
    render(
      <Button variant="notebookPrimary">
        <Search aria-hidden="true" />
        查詢
      </Button>
    );

    const button = screen.getByRole("button", { name: "查詢" });
    expect(button).toHaveClass("notebook-control", "notebook-control-primary");
    expect(button.className).not.toContain("bg-blue-700");
  });

  it("renders notebook secondary with the shared notebook control affordance", () => {
    render(<Button variant="notebookSecondary">匯出 CSV / Excel</Button>);

    expect(screen.getByRole("button", { name: "匯出 CSV / Excel" })).toHaveClass(
      "notebook-control",
      "notebook-control-secondary"
    );
  });

  it("renders notebook danger as a stamp-outline report action", () => {
    render(
      <Button variant="notebookDanger">
        <AlertTriangle aria-hidden="true" />
        回報資料問題
      </Button>
    );

    const button = screen.getByRole("button", { name: "回報資料問題" });
    expect(button).toHaveClass("notebook-control", "notebook-control-danger");
  });

  it("exposes notebook variant classes through buttonVariants for non-rendered composition", () => {
    expect(buttonVariants({ variant: "notebookUtility", size: "notebookIcon" })).toContain(
      "notebook-control-utility"
    );
    expect(buttonVariants({ variant: "notebookTab", size: "default" })).toContain(
      "notebook-control-tab"
    );
  });
});
