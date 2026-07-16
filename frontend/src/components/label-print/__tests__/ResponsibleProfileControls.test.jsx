import { render, screen } from "@testing-library/react";
import ResponsibleProfileControls from "@/components/label-print/ResponsibleProfileControls";
import { LAB_PROFILE_LIMITS } from "@/hooks/useLabProfile";

describe("ResponsibleProfileControls", () => {
  it("enforces the responsible-profile bounds at the input boundary", () => {
    render(
      <ResponsibleProfileControls
        open
        tone="neutral"
        status="Optional"
        presentCount={0}
        fieldTotal={3}
        required={false}
        labProfile={{ organization: "", phone: "", address: "" }}
        onLabProfileChange={jest.fn()}
        onClearLabProfile={jest.fn()}
        t={(key) => key}
        tx={(_key, fallback) => fallback}
      />,
    );

    expect(
      screen.getByTestId("responsible-profile-field-organization"),
    ).toHaveAttribute("maxlength", String(LAB_PROFILE_LIMITS.organization));
    expect(screen.getByTestId("responsible-profile-field-phone")).toHaveAttribute(
      "maxlength",
      String(LAB_PROFILE_LIMITS.phone),
    );
    expect(
      screen.getByTestId("responsible-profile-field-address"),
    ).toHaveAttribute("maxlength", String(LAB_PROFILE_LIMITS.address));
  });
});
