import { renderHook, act } from "@testing-library/react";
import useLabProfile, { LAB_PROFILE_KEY } from "../useLabProfile";

describe("useLabProfile", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with an empty profile when nothing is stored", () => {
    const { result } = renderHook(() => useLabProfile());
    expect(result.current.labProfile).toEqual({
      organization: "",
      phone: "",
      address: "",
    });
  });

  it("hydrates from the dedicated lab-profile storage key", () => {
    localStorage.setItem(
      LAB_PROFILE_KEY,
      JSON.stringify({
        organization: "Materials Lab",
        phone: "+886-2-1234-5678",
        address: "Taipei",
      })
    );

    const { result } = renderHook(() => useLabProfile());

    expect(result.current.labProfile).toEqual({
      organization: "Materials Lab",
      phone: "+886-2-1234-5678",
      address: "Taipei",
    });
  });

  it("migrates legacy customLabelFields.labName into organization when needed", () => {
    localStorage.setItem(
      "ghs_custom_label_fields",
      JSON.stringify({
        labName: "Legacy Lab",
        date: "2026-04-17",
        batchNumber: "B1",
      })
    );

    const { result } = renderHook(() => useLabProfile());

    expect(result.current.labProfile).toEqual({
      organization: "Legacy Lab",
      phone: "",
      address: "",
    });
  });

  it("setLabProfile sanitizes and persists values, and clearLabProfile resets them", () => {
    const { result } = renderHook(() => useLabProfile());

    act(() => {
      result.current.setLabProfile({
        organization: "Materials Lab",
        phone: "02-1234",
        address: "Taipei",
        ignored: "x",
      });
    });

    expect(result.current.labProfile).toEqual({
      organization: "Materials Lab",
      phone: "02-1234",
      address: "Taipei",
    });
    expect(JSON.parse(localStorage.getItem(LAB_PROFILE_KEY))).toEqual({
      organization: "Materials Lab",
      phone: "02-1234",
      address: "Taipei",
    });

    act(() => {
      result.current.clearLabProfile();
    });

    expect(result.current.labProfile).toEqual({
      organization: "",
      phone: "",
      address: "",
    });
    expect(JSON.parse(localStorage.getItem(LAB_PROFILE_KEY))).toEqual({
      organization: "",
      phone: "",
      address: "",
    });
  });
});
