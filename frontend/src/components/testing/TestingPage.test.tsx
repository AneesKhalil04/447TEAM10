import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TestingPage from "./TestingPage";

describe("TestingPage", () => {
  it("asks for confirmation before resetting to the sample data", async () => {
    const reset = vi.fn().mockResolvedValue({ deleted_uploads: 3, deleted_rows: 55, loaded_rows: 52 });
    render(<TestingPage reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset to sample data" }));
    expect(reset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Deleted 3 upload(s) and 55 week(s) of data. Loaded 52 sample weeks.",
    );
    expect(reset).toHaveBeenCalledWith(true);
  });

  it("can clear everything, and cancel backs out", async () => {
    const reset = vi.fn().mockResolvedValue({ deleted_uploads: 1, deleted_rows: 52, loaded_rows: 0 });
    render(<TestingPage reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear everything" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Yes, delete" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear everything" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The dashboard is now empty.");
    expect(reset).toHaveBeenCalledWith(false);
  });
});
