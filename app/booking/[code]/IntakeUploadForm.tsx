"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type IntakeUploadFormProps = {
  confirmationCode: string;
  hasDriversLicense: boolean;
  hasInsurance: boolean;
};

export default function IntakeUploadForm({
  confirmationCode,
  hasDriversLicense,
  hasInsurance,
}: IntakeUploadFormProps) {
  const router = useRouter();

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingInsurance, setUploadingInsurance] = useState(false);

  const [licenseError, setLicenseError] = useState("");
  const [insuranceError, setInsuranceError] = useState("");

  async function uploadDocument(
    file: File,
    documentType: "drivers_license" | "insurance"
  ) {
    const formData = new FormData();

    formData.append("confirmationCode", confirmationCode);
    formData.append("documentType", documentType);
    formData.append("file", file);

    const response = await fetch("/api/intake", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to upload document.");
    }
  }

  async function handleLicenseUpload() {
    if (!licenseFile) {
      setLicenseError("Choose a driver's license file first.");
      return;
    }

    try {
      setUploadingLicense(true);
      setLicenseError("");

      await uploadDocument(licenseFile, "drivers_license");

      setLicenseFile(null);
      router.refresh();
    } catch (error) {
      setLicenseError(
        error instanceof Error
          ? error.message
          : "Unable to upload driver's license."
      );
    } finally {
      setUploadingLicense(false);
    }
  }

  async function handleInsuranceUpload() {
    if (!insuranceFile) {
      setInsuranceError("Choose an insurance file first.");
      return;
    }

    try {
      setUploadingInsurance(true);
      setInsuranceError("");

      await uploadDocument(insuranceFile, "insurance");

      setInsuranceFile(null);
      router.refresh();
    } catch (error) {
      setInsuranceError(
        error instanceof Error
          ? error.message
          : "Unable to upload insurance."
      );
    } finally {
      setUploadingInsurance(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 24,
        marginBottom: 24,
        padding: 22,
        background: "#111814",
        border: "1px solid #27332c",
        borderRadius: 12,
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 8,
          color: "#7DFB00",
          fontSize: 22,
        }}
      >
        Rental Intake
      </h2>

      <p
        style={{
          marginTop: 0,
          marginBottom: 22,
          lineHeight: 1.6,
          color: "#d1d5db",
        }}
      >
        Please upload a valid driver's license and proof of insurance before
        pickup.
      </p>

      <div
        style={{
          padding: 18,
          marginBottom: 18,
          background: "#18201c",
          borderRadius: 10,
        }}
      >
        <strong>Driver&apos;s License</strong>

        {hasDriversLicense ? (
          <p
            style={{
              marginBottom: 0,
              color: "#7DFB00",
              fontWeight: 700,
            }}
          >
            ✓ Driver&apos;s license received
          </p>
        ) : (
          <>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) =>
                setLicenseFile(event.target.files?.[0] ?? null)
              }
              style={{
                display: "block",
                marginTop: 14,
                marginBottom: 12,
                width: "100%",
              }}
            />

            <button
              type="button"
              onClick={handleLicenseUpload}
              disabled={uploadingLicense}
              style={{
                width: "100%",
                padding: "13px 18px",
                background: "#7DFB00",
                color: "#111827",
                border: "none",
                borderRadius: 8,
                fontWeight: 800,
                cursor: uploadingLicense ? "wait" : "pointer",
                opacity: uploadingLicense ? 0.7 : 1,
              }}
            >
              {uploadingLicense
                ? "Uploading..."
                : "Upload Driver's License"}
            </button>

            {licenseError && (
              <p
                style={{
                  color: "#ff6b6b",
                  marginBottom: 0,
                }}
              >
                {licenseError}
              </p>
            )}
          </>
        )}
      </div>

      <div
        style={{
          padding: 18,
          background: "#18201c",
          borderRadius: 10,
        }}
      >
        <strong>Proof of Insurance</strong>

        {hasInsurance ? (
          <p
            style={{
              marginBottom: 0,
              color: "#7DFB00",
              fontWeight: 700,
            }}
          >
            ✓ Insurance received
          </p>
        ) : (
          <>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) =>
                setInsuranceFile(event.target.files?.[0] ?? null)
              }
              style={{
                display: "block",
                marginTop: 14,
                marginBottom: 12,
                width: "100%",
              }}
            />

            <button
              type="button"
              onClick={handleInsuranceUpload}
              disabled={uploadingInsurance}
              style={{
                width: "100%",
                padding: "13px 18px",
                background: "#7DFB00",
                color: "#111827",
                border: "none",
                borderRadius: 8,
                fontWeight: 800,
                cursor: uploadingInsurance ? "wait" : "pointer",
                opacity: uploadingInsurance ? 0.7 : 1,
              }}
            >
              {uploadingInsurance
                ? "Uploading..."
                : "Upload Proof of Insurance"}
            </button>

            {insuranceError && (
              <p
                style={{
                  color: "#ff6b6b",
                  marginBottom: 0,
                }}
              >
                {insuranceError}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}