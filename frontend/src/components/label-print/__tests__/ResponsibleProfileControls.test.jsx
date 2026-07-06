import { fireEvent, render, screen } from "@testing-library/react";
import ResponsibleProfileControls from "../ResponsibleProfileControls";

function renderControls(overrides = {}) {
  const props = {
    open: true,
    tone: "danger",
    status: "Required for complete primary",
    presentCount: 2,
    fieldTotal: 3,
    required: true,
    labProfile: {
      organization: "Lab A",
      phone: "02-1234",
      address: "",
    },
    onLabProfileChange: jest.fn(),
    onClearLabProfile: jest.fn(),
    t: (key) => key,
    tx: (_key, fallback) => fallback,
    ...overrides,
  };

  render(<ResponsibleProfileControls {...props} />);
  return props;
}

describe("ResponsibleProfileControls", () => {
  it("keeps IME composition drafts local until composition ends", () => {
    const props = renderControls();
    const address = screen.getByTestId("responsible-profile-field-address");

    fireEvent.compositionStart(address);
    fireEvent.change(address, { target: { value: "ㄅ" } });

    expect(address).toHaveValue("ㄅ");
    expect(props.onLabProfileChange).not.toHaveBeenCalled();

    fireEvent.compositionEnd(address, { target: { value: "北" } });

    expect(props.onLabProfileChange).toHaveBeenCalledTimes(1);
    expect(props.onLabProfileChange).toHaveBeenCalledWith({
      organization: "Lab A",
      phone: "02-1234",
      address: "北",
    });
  });
});
