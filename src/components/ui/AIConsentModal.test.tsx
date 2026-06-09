import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AIConsentModal } from "./AIConsentModal";
import { consentService } from "@/shared/services/healthcare";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-id", email: "patient@example.com" },
  }),
}));

vi.mock("@/shared/services/healthcare", () => ({
  consentService: {
    create: vi.fn(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("AIConsentModal", () => {
  beforeEach(() => {
    (consentService.create as ReturnType<typeof vi.fn>).mockReset();
  });

  it("disables the agree button until both acknowledgements are checked", () => {
    render(<AIConsentModal open onAccepted={vi.fn()} onCancel={vi.fn()} />);

    const agreeButton = screen.getByRole("button", { name: /i agree/i });
    expect(agreeButton).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(/I understand this AI assistant is not a qualified doctor/i)
    );
    expect(agreeButton).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(/I agree that my conversations with the AI assistant will be stored securely/i)
    );
    expect(agreeButton).toBeEnabled();
  });

  it("calls consentService.create and onAccepted when the user accepts", async () => {
    const onAccepted = vi.fn();
    (consentService.create as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    render(<AIConsentModal open onAccepted={onAccepted} onCancel={vi.fn()} />);

    fireEvent.click(
      screen.getByLabelText(/I understand this AI assistant is not a qualified doctor/i)
    );
    fireEvent.click(
      screen.getByLabelText(/I agree that my conversations with the AI assistant will be stored securely/i)
    );

    fireEvent.click(screen.getByRole("button", { name: /i agree/i }));

    await waitFor(() => expect(consentService.create).toHaveBeenCalled());
    expect(consentService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: "user-id",
        granted: true,
      })
    );
    await waitFor(() => expect(onAccepted).toHaveBeenCalled());
  });

  it("calls onCancel when the user cancels", () => {
    const onCancel = vi.fn();

    render(<AIConsentModal open onAccepted={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
