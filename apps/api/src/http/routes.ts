import {
  AddMemberRequestSchema,
  CreateExpenseRequestSchema,
  CreateGroupRequestSchema,
  CreatePaymentRequestSchema,
} from '@tally/shared';
import type { FastifyPluginCallback } from 'fastify';
import type { GroupService } from '../application/group-service';
import { idParam, parse } from './problem';
import { toExpenseDto, toGroupDto, toPaymentDto } from './presenters';

interface GroupParams {
  groupId: string;
}

interface ExpenseParams extends GroupParams {
  expenseId: string;
}

const groupId = (params: GroupParams): string =>
  idParam(params.groupId, 'group.not_found', 'This group does not exist.');

/** Thin adapters: parse input, call one use case, present the result. No business logic here. */
export function groupRoutes(service: GroupService): FastifyPluginCallback {
  return (app, _options, done) => {
    app.post('/groups', async (request, reply) => {
      const group = await service.createGroup(parse(CreateGroupRequestSchema, request.body));
      return reply
        .status(201)
        .header('location', `/api/groups/${group.id}`)
        .send(toGroupDto(group));
    });

    app.get<{ Params: GroupParams }>('/groups/:groupId', async (request) =>
      toGroupDto(await service.getGroup(groupId(request.params))),
    );

    app.post<{ Params: GroupParams }>('/groups/:groupId/members', async (request, reply) => {
      const member = await service.addMember(
        groupId(request.params),
        parse(AddMemberRequestSchema, request.body),
      );
      return reply.status(201).send(member);
    });

    app.get<{ Params: GroupParams }>('/groups/:groupId/expenses', async (request) =>
      (await service.listExpenses(groupId(request.params))).map(toExpenseDto),
    );

    app.post<{ Params: GroupParams }>('/groups/:groupId/expenses', async (request, reply) => {
      const expense = await service.addExpense(
        groupId(request.params),
        parse(CreateExpenseRequestSchema, request.body),
      );
      return reply.status(201).send(toExpenseDto(expense));
    });

    app.delete<{ Params: ExpenseParams }>(
      '/groups/:groupId/expenses/:expenseId',
      async (request, reply) => {
        const expenseId = idParam(
          request.params.expenseId,
          'expense.not_found',
          'This expense does not exist.',
        );
        await service.deleteExpense(groupId(request.params), expenseId);
        return reply.status(204).send();
      },
    );

    app.get<{ Params: GroupParams }>('/groups/:groupId/payments', async (request) =>
      (await service.listPayments(groupId(request.params))).map(toPaymentDto),
    );

    app.post<{ Params: GroupParams }>('/groups/:groupId/payments', async (request, reply) => {
      const payment = await service.recordPayment(
        groupId(request.params),
        parse(CreatePaymentRequestSchema, request.body),
      );
      return reply.status(201).send(toPaymentDto(payment));
    });

    app.get<{ Params: GroupParams }>('/groups/:groupId/summary', async (request) =>
      service.getSummary(groupId(request.params)),
    );
    done();
  };
}
