"use client";

import { useState } from "react";

type Props = {
  confirmationCode: string;
  alreadyAccepted?: boolean;
};

export default function RentalAgreementForm({
  confirmationCode,
  alreadyAccepted = false,
}: Props) {
  const [agreed, setAgreed] = useState(alreadyAccepted);
  const [signature, setSignature] = useState("");
  const [submitted, setSubmitted] = useState(alreadyAccepted);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submitAgreement() {
    if (!agreed) {
      setMessage("Please check the box confirming that you agree to the Rental Agreement.");
      return;
    }

    if (!signature.trim()) {
      setMessage("Please enter your full legal name as your signature.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/intake/agreement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationCode,
          signature: signature.trim(),
          agreementVersion: "2026-08-13",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save Rental Agreement.");
      }

      setSubmitted(true);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save Rental Agreement."
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 10,
          background: "#18201c",
          border: "1px solid #7DFB00",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#7DFB00" }}>
          Rental Agreement
        </h3>

        <div style={{ color: "#7DFB00", fontWeight: 800 }}>
          ✓ Rental Agreement Accepted & Signed
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 20,
        padding: 20,
        borderRadius: 10,
        background: "#18201c",
        border: "1px solid #333",
      }}
    >
      <h3 style={{ marginTop: 0, color: "#7DFB00" }}>
        Rental Agreement
      </h3>

      <div
        style={{
          maxHeight: 300,
          overflowY: "auto",
          padding: 16,
          marginBottom: 20,
          background: "#111",
          border: "1px solid #444",
          borderRadius: 8,
          color: "#fff",
          lineHeight: 1.6,
        }}
      >
        <h4 style={{ color: "#7DFB00", marginTop: 0 }}>
          COMMERCIAL TRAILER RENTAL AGREEMENT
        </h4>

        <p>
          Please carefully read the complete Rental Agreement before
          accepting and signing below.
        </p>

        <p>
          By accepting this agreement, the renter acknowledges responsibility
          for the rented trailer during the rental period and agrees to comply
          with all terms, conditions, restrictions, insurance requirements,
          damage responsibilities, return requirements, and other provisions
          contained in the Rental Agreement.
        </p>

        <p>
          The renter acknowledges that their electronic acceptance and
          signature are intended to constitute their signature on the Rental
          Agreement.
        </p>

        <div style={{ lineHeight: 1.6 }}>
  <h3 style={{ textAlign: "center", marginTop: 0 }}>
    ROLL&apos;N TRAILER RENTALS N MORE LLC
  </h3>

  <h4 style={{ textAlign: "center" }}>
    COMMERCIAL TRAILER RENTAL AGREEMENT
  </h4>

  <p>
    This Commercial Trailer Rental Agreement (&quot;Agreement&quot;) is
    entered into between Roll&apos;N Trailer Rentals N More LLC
    (&quot;Company,&quot; &quot;We,&quot; &quot;Us,&quot; &quot;Our&quot;)
    and the undersigned renter (&quot;Renter,&quot; &quot;You&quot;).
  </p>

  <p><strong>By signing, Renter agrees:</strong></p>

  <h4>1. Definitions</h4>
  <p>
    &quot;Authorized Driver&quot; means any driver approved by Company who
    meets Agreement requirements.
  </p>
  <p>
    &quot;Trailer&quot; means the non-motorized trailer identified in this
    Agreement and any substitute trailer provided.
  </p>
  <p>
    &quot;Loss of Use&quot; means the number of days the Trailer is unavailable
    multiplied by the daily rental rate.
  </p>
  <p>
    &quot;Diminished Value&quot; means the reduction in market value after
    damage.
  </p>

  <h4>2. Authorized Driver Requirements</h4>
  <p>
    Authorized drivers must be at least 18 years old, have a valid
    driver&apos;s license, be legally permitted to tow, and be approved by
    Company. Renter is responsible for all actions of any Authorized Driver.
  </p>

  <h4>3. Equipment Identification</h4>
  <p>
    The Trailer information listed in this entry (VIN/plate/type) is
    incorporated into this Agreement. Renter acknowledges receipt in good
    condition unless otherwise noted.
  </p>

  <h4>4. Inspection and Acceptance / No Warranties</h4>
  <p>
    Renter confirms they inspected the Trailer and accept it in safe, operable
    condition. The Trailer is rented AS-IS with no express or implied
    warranties, including merchantability or fitness for a particular purpose.
  </p>

  <h4>5. Rental Period and Responsibility</h4>
  <p>
    Renter&apos;s responsibility begins when the Trailer leaves Company
    possession and continues until returned and inspected by Company. Returning
    after hours does not end responsibility until inspection.
  </p>

  <h4>6. Assumption of Risk</h4>
  <p>
    Towing and operating a trailer involves inherent risks. Renter voluntarily
    assumes all risks associated with possession, towing, loading, unloading,
    and use of the Trailer, except to the extent caused solely by Company&apos;s
    gross negligence or willful misconduct.
  </p>

  <h4>7. Responsibility for Damage, Loss, or Theft</h4>
  <p>
    Renter is fully responsible for all damage, loss, or theft regardless of
    cause (including weather and acts of nature). Renter agrees to pay repair
    costs or replacement value if not repairable, plus Loss of Use, Diminished
    Value, missing equipment, administrative costs, recovery/towing, and related
    expenses.
  </p>

  <h4>8. Accident / Incident Reporting</h4>
  <p>
    Renter shall notify Company as soon as reasonably possible and safe to do
    so of any accident, damage, theft, loss, or incident involving the Trailer,
    notify law enforcement where applicable, and cooperate with Company and
    insurers. Failure to provide timely notice may result in additional
    liability to the fullest extent permitted by law.
  </p>

  <h4>9. Prohibited Uses</h4>
  <p>
    Trailer may not be used for: illegal purposes; hazardous/illegal materials;
    use under drugs/alcohol; use by unauthorized drivers; overloading beyond
    manufacturer limits; improper clearance; operating after known damage;
    improperly secured cargo; reckless/intentional misuse; modifications/
    painting; or use outside the United States.
  </p>

  <h4>10. Passenger Prohibition (Parade Exception Only)</h4>
  <p>
    Transporting passengers in or on the Trailer is strictly prohibited.
    Exception: passengers may be permitted solely for organized parade use with
    prior written approval and execution of a Parade Use Waiver and Liability
    Release. Unauthorized passenger transport is a material breach and may
    result in additional liability.
  </p>

  <h4>11. Insurance Requirements</h4>
  <p>
    Renter must maintain liability insurance covering the towing vehicle and
    attached Trailer for the entire rental period and confirms coverage is
    active. Any insurance maintained by Company does not relieve Renter of
    financial responsibility. Company does not insure cargo or personal
    property.
  </p>

  <h4>12. No Bailment / Cargo</h4>
  <p>
    Company is not a bailee and assumes no responsibility for any property
    placed in or on the Trailer.
  </p>

  <h4>13. Mechanical Failure</h4>
  <p>
    Company is not liable for losses caused by mechanical failure.
    Company&apos;s obligation, if any, is repair or replacement of the Trailer
    at Company&apos;s discretion.
  </p>

  <h4>14. Charges and Fees</h4>
  <p>
    Renter agrees to pay all charges including rental fees, taxes, tolls/
    traffic violations, $100 administrative fee per unpaid violation, recovery/
    towing costs, cleaning fees up to $250, returned payment fee of $100, late
    payment fee of 5%, and all collection costs, court costs, attorney fees,
    and expenses incurred in enforcing this Agreement. No refunds for early
    returns.
  </p>

  <h4>15. Credit/Debit Card Authorization</h4>
  <p>
    Renter authorizes Company to charge any payment method on file for all
    amounts owed under this Agreement.
  </p>

  <h4>16. Deposit</h4>
  <p>
    Company may apply any deposit to unpaid charges, damage, or fees. Any
    remaining balance is still owed by Renter.
  </p>

  <h4>17. Indemnification</h4>
  <p>
    Renter agrees to indemnify, defend, and hold harmless Company from all
    claims, damages, liabilities, costs, and attorney fees arising from
    Renter&apos;s possession, towing, loading, unloading, or use of the Trailer.
  </p>

  <h4>18. Limitation of Liability</h4>
  <p>
    To the fullest extent permitted by Georgia law, Company is not liable for
    indirect, incidental, special, punitive, or consequential damages. Company
    is only liable for damages caused by its gross negligence or willful
    misconduct.
  </p>

  <h4>19. Default and Repossession</h4>
  <p>
    If Renter violates this Agreement, Company may terminate the rental and
    repossess or recover the Trailer at Renter&apos;s expense, without prior
    notice where permitted by law.
  </p>

  <h4>20. Governing Law and Venue</h4>
  <p>
    This Agreement is governed by Georgia law. Venue for any dispute shall be
    in Georgia courts.
  </p>

  <h4>21. Entire Agreement; Modifications; Severability; Waiver</h4>
  <p>
    This Agreement is the entire agreement. Modifications must be in writing
    and signed by Company. If any provision is unenforceable, the remainder
    remains in effect. Failure to enforce any provision is not a waiver.
  </p>

  <h4>22. Electronic Signature</h4>
  <p>
    Renter agrees that electronic signatures are binding and enforceable.
  </p>

  <p>
    <strong>
      Renter acknowledges they have read, understand, and agree to all terms
      above.
    </strong>
  </p>
</div>
      </div>

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 20,
          color: "#fff",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{
            width: 20,
            height: 20,
            marginTop: 2,
          }}
        />

        <span>
          I have read and agree to the Roll&apos;N Trailer Rentals N More LLC
          Rental Agreement.
        </span>
      </label>

      <label
        style={{
          display: "block",
          marginBottom: 8,
          color: "#fff",
          fontWeight: 700,
        }}
      >
        Electronic Signature
      </label>

      <input
        type="text"
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
        placeholder="Type your full legal name"
        autoComplete="name"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "14px 12px",
          marginBottom: 8,
          borderRadius: 7,
          border: "1px solid #555",
          background: "#fff",
          color: "#111",
          fontSize: 16,
        }}
      />

      <div
        style={{
          marginBottom: 18,
          color: "#aaa",
          fontSize: 13,
        }}
      >
        Typing your full legal name above constitutes your electronic
        signature.
      </div>

      {message && (
        <div
          style={{
            marginBottom: 15,
            color: "#ff7070",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={submitAgreement}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px 18px",
          border: 0,
          borderRadius: 7,
          background: "#7DFB00",
          color: "#111",
          fontWeight: 800,
          fontSize: 16,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Saving..." : "Accept & Sign Rental Agreement"}
      </button>
    </div>
  );
}