import { render, screen } from "@testing-library/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../alert-dialog";

describe("Dialog viewport safety", () => {
  it("keeps regular dialog content bounded and scrollable by default", () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog-content">
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
          <div>Long dialog body</div>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId("dialog-content")).toHaveClass(
      "max-h-[calc(100vh-2rem)]",
      "overflow-y-auto",
    );
  });

  it("keeps alert dialog content bounded and scrollable by default", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent data-testid="alert-dialog-content">
          <AlertDialogTitle>Alert title</AlertDialogTitle>
          <AlertDialogDescription>Alert description</AlertDialogDescription>
          <div>Long alert body</div>
        </AlertDialogContent>
      </AlertDialog>
    );

    expect(screen.getByTestId("alert-dialog-content")).toHaveClass(
      "max-h-[calc(100vh-2rem)]",
      "overflow-y-auto",
    );
  });
});
