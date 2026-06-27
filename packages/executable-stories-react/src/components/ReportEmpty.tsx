import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export interface ReportEmptyProps {
  message?: string;
}

export function ReportEmpty({ message }: ReportEmptyProps) {
  return (
    <Empty aria-live="polite" className="border">
      <EmptyHeader>
        <EmptyTitle>{message ?? "No scenarios in this report."}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
