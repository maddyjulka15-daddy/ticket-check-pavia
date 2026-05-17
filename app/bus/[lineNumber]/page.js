import { getBusLine } from '@/lib/busLines';
import BusLineView from './BusLineView';
import { notFound } from 'next/navigation';

export default async function BusLinePage({ params }) {
  const { lineNumber } = await params;
  const line = getBusLine(lineNumber);
  if (!line) notFound();
  return <BusLineView line={line} />;
}
