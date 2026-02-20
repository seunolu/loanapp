import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { DelinquencyStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

type ExportFormat = 'csv' | 'json';

type DateRangeInput = {
  from?: string;
  to?: string;
};

function parseDateRange(input: DateRangeInput): { from: Date | null; to: Date | null } {
  const from = input.from ? new Date(input.from) : null;
  const to = input.to ? new Date(input.to) : null;
  return {
    from: from && !Number.isNaN(from.getTime()) ? from : null,
    to: to && !Number.isNaN(to.getTime()) ? to : null
  };
}

function csvEscape(value: unknown): string {
  const raw = value == null ? '' : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

@Injectable()
export class RegulatoryExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async streamLoanBook(
    res: Response,
    tenantId: string,
    format: ExportFormat,
    rangeInput: DateRangeInput
  ): Promise<void> {
    const range = parseDateRange(rangeInput);
    const where = {
      tenantId,
      ...(range.from || range.to
        ? {
            createdAt: {
              ...(range.from ? { gte: range.from } : {}),
              ...(range.to ? { lte: range.to } : {})
            }
          }
        : {})
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.write('[');
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.write(
        ['id', 'status', 'fullName', 'phone', 'requestedAmount', 'approvedAmount', 'disbursedAmount', 'outstandingTotal', 'createdAt'].join(',') +
          '\n'
      );
    }

    let cursorId: string | null = null;
    let first = true;
    for (;;) {
      const rows: Array<any> = await this.prisma.tenantLoanApplication.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 500,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {})
      });
      if (rows.length === 0) break;

      for (const row of rows) {
        if (format === 'json') {
          if (!first) res.write(',');
          first = false;
          res.write(
            JSON.stringify({
              id: row.id,
              status: row.status,
              fullName: row.fullName,
              phone: row.phone,
              requestedAmount: row.requestedAmount.toString(),
              approvedAmount: row.approvedAmount?.toString() ?? null,
              disbursedAmount: row.disbursedAmount?.toString() ?? null,
              outstandingTotal: row.outstandingTotal.toString(),
              createdAt: row.createdAt.toISOString()
            })
          );
        } else {
          const values = [
            row.id,
            row.status,
            row.fullName,
            row.phone,
            row.requestedAmount.toString(),
            row.approvedAmount?.toString() ?? '',
            row.disbursedAmount?.toString() ?? '',
            row.outstandingTotal.toString(),
            row.createdAt.toISOString()
          ];
          res.write(values.map((value) => csvEscape(value)).join(',') + '\n');
        }
      }

      cursorId = rows[rows.length - 1].id;
    }

    if (format === 'json') {
      res.write(']');
    }
  }

  async streamDelinquency(
    res: Response,
    tenantId: string,
    format: ExportFormat,
    rangeInput: DateRangeInput
  ): Promise<void> {
    const range = parseDateRange(rangeInput);
    const where = {
      tenantId,
      delinquencyStatus: { in: [DelinquencyStatus.OVERDUE, DelinquencyStatus.CHARGED_OFF] },
      ...(range.from || range.to
        ? {
            updatedAt: {
              ...(range.from ? { gte: range.from } : {}),
              ...(range.to ? { lte: range.to } : {})
            }
          }
        : {})
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.write('[');
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.write(['id', 'status', 'delinquencyStatus', 'daysPastDue', 'overdueAmountCents', 'fullName', 'phone', 'updatedAt'].join(',') + '\n');
    }

    let cursorId: string | null = null;
    let first = true;
    for (;;) {
      const rows: Array<any> = await this.prisma.tenantLoanApplication.findMany({
        where,
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        take: 500,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {})
      });
      if (rows.length === 0) break;

      for (const row of rows) {
        if (format === 'json') {
          if (!first) res.write(',');
          first = false;
          res.write(
            JSON.stringify({
              id: row.id,
              status: row.status,
              delinquencyStatus: row.delinquencyStatus,
              daysPastDue: row.daysPastDue,
              overdueAmountCents: row.overdueAmountCents.toString(),
              fullName: row.fullName,
              phone: row.phone,
              updatedAt: row.updatedAt.toISOString()
            })
          );
        } else {
          const values = [
            row.id,
            row.status,
            row.delinquencyStatus,
            row.daysPastDue,
            row.overdueAmountCents.toString(),
            row.fullName,
            row.phone,
            row.updatedAt.toISOString()
          ];
          res.write(values.map((value) => csvEscape(value)).join(',') + '\n');
        }
      }
      cursorId = rows[rows.length - 1].id;
    }
    if (format === 'json') {
      res.write(']');
    }
  }

  async streamLedger(
    res: Response,
    tenantId: string,
    format: ExportFormat,
    rangeInput: DateRangeInput
  ): Promise<void> {
    const range = parseDateRange(rangeInput);
    const where = {
      tenantId,
      ...(range.from || range.to
        ? {
            occurredAt: {
              ...(range.from ? { gte: range.from } : {}),
              ...(range.to ? { lte: range.to } : {})
            }
          }
        : {})
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.write('[');
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.write(
        ['entryId', 'occurredAt', 'type', 'referenceType', 'referenceId', 'idempotencyKey', 'accountCode', 'direction', 'amount', 'currency'].join(',') +
          '\n'
      );
    }

    let cursorId: string | null = null;
    let first = true;
    for (;;) {
      const rows: Array<any> = await this.prisma.tenantLedgerEntry.findMany({
        where,
        include: { lines: true },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        take: 200,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {})
      });
      if (rows.length === 0) break;

      for (const entry of rows) {
        for (const line of entry.lines) {
          if (format === 'json') {
            if (!first) res.write(',');
            first = false;
            res.write(
              JSON.stringify({
                entryId: entry.id,
                occurredAt: entry.occurredAt.toISOString(),
                type: entry.type,
                referenceType: entry.referenceType,
                referenceId: entry.referenceId,
                idempotencyKey: entry.idempotencyKey,
                accountCode: line.accountId,
                direction: line.direction,
                amount: line.amount.toString(),
                currency: line.currency
              })
            );
          } else {
            const values = [
              entry.id,
              entry.occurredAt.toISOString(),
              entry.type,
              entry.referenceType,
              entry.referenceId,
              entry.idempotencyKey,
              line.accountId,
              line.direction,
              line.amount.toString(),
              line.currency
            ];
            res.write(values.map((value) => csvEscape(value)).join(',') + '\n');
          }
        }
      }
      cursorId = rows[rows.length - 1].id;
    }
    if (format === 'json') {
      res.write(']');
    }
  }
}
