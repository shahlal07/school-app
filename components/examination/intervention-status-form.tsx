"use client";
import { useTransition } from "react";
import { updateIntervention } from "@/app/coordinator/interventions/actions";
export function InterventionStatusForm({id,status,outcome}:{id:string;status:string;outcome:string|null}){const[pending,startTransition]=useTransition();const next=status==='completed'?'open':'completed';return <button type="button" disabled={pending} onClick={()=>startTransition(()=>{void updateIntervention(id,next,outcome??'')})} className="text-xs font-medium text-primary-600 disabled:opacity-50">{pending?'Saving…':status==='completed'?'Re-open':'Mark completed'}</button>}
