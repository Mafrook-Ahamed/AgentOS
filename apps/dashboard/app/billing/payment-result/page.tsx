import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";

export default async function PaymentResultPage({searchParams}:{searchParams:Promise<{razorpay_payment_link_id?:string;razorpay_payment_id?:string;razorpay_payment_link_status?:string;reference_id?:string}>}){
 const params=await searchParams;
 return <main className="payment-result-page"><section><span className="payment-result-icon"><Clock3 size={26}/></span><div className="eyebrow">AGENTOS BILLING</div><h1>Payment submitted</h1><p>Your payment details have been received. AgentOS will update the invoice after the secure Razorpay webhook confirms the captured payment.</p>{params.reference_id&&<small>Invoice reference: {params.reference_id}</small>}{params.razorpay_payment_id&&<small>Payment ID: {params.razorpay_payment_id}</small>}<Link href="/billing">Return to billing</Link></section></main>
}
