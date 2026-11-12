"use client";
import { useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";

export default function RazorpayPaymentLink({ invoiceId, existingUrl }: { invoiceId: string; existingUrl?: string | null }) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  async function createLink(){
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/razorpay/payment-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({invoice_id:invoiceId})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error??"Could not create payment link.");
      window.location.assign(result.payment_url);
    }catch(e){setError(e instanceof Error?e.message:"Payment link failed.");}
    finally{setLoading(false);}
  }
  return <div className="razorpay-link-control"><button type="button" onClick={createLink} disabled={loading}>{loading?<LoaderCircle size={13} className="spin"/>:<ExternalLink size={13}/>} {existingUrl?"Open payment link":"Create payment link"}</button>{error&&<small role="alert">{error}</small>}</div>;
}
