import { supabase } from './supabase';
import { ensureSession } from './api';

export type ChatMsg = { role: 'user' | 'assistant'; content: string; translation?: string; correction?: string | null };

/** Role-play scenarios for the AI conversation partner (prompt text is for the model). */
export const SCENARIOS: { id: string; emoji: string; prompt: string }[] = [
  { id: 'cafe', emoji: '☕', prompt: 'At a café. You are the friendly waiter; the learner is the customer ordering drinks and food.' },
  { id: 'shop', emoji: '🛍️', prompt: 'In a clothes shop. You are the shop assistant; the learner wants to buy something and asks about sizes and prices.' },
  { id: 'directions', emoji: '🧭', prompt: 'On a city street. You are a local; the learner is a tourist asking how to get somewhere.' },
  { id: 'hotel', emoji: '🏨', prompt: 'At a hotel reception. You are the receptionist; the learner is checking in.' },
  { id: 'doctor', emoji: '💊', prompt: 'At a doctor’s appointment. You are a kind doctor; the learner explains how they feel.' },
  { id: 'friend', emoji: '💬', prompt: 'Meeting a new friend at a party. Chat about hobbies, work, travel and plans for the weekend.' },
  { id: 'interview', emoji: '💼', prompt: 'A short, friendly job interview. You are the interviewer; ask simple questions about experience and skills.' },
  { id: 'free', emoji: '✨', prompt: 'A free, friendly conversation about everyday life. Let the learner choose the topic.' },
];

export async function chatTurn(input: { messages: ChatMsg[]; scenario: string; target: string; native: string; level: string }): Promise<{ reply: string; translation: string; correction: string | null; error?: string }> {
  await ensureSession();
  const { data, error } = await supabase.functions.invoke('chat', {
    body: { ...input, messages: input.messages.map((m) => ({ role: m.role, content: m.content })) },
  });
  if (error) throw error;
  return data;
}
