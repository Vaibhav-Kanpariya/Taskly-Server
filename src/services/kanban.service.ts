import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { Kanban } from "../entities/kanban.entity";
import { Task, TaskStatus } from "../entities/task.entity";
import { User } from "../entities/user.entity";
import { AppDataSource } from "../utils/data-source";
import { get } from "lodash";

const kanbanRepository = AppDataSource.getRepository(Kanban);
const taskRepository = AppDataSource.getRepository(Task);
const userRepository = AppDataSource.getRepository(User);

const getTaskColumn = (status: string) => {
  switch (status) {
    case "todo":
      return "To Do";
    case "inProgress":
      return "In Progress";
    case "testing":
      return "Testing";
    case "complete":
      return "Complete";
    case "onHold":
      return "On Hold";
    case "canceled":
      return "Canceled";
    case "reopened":
      return "Reopened";
    default:
      return "To Do";
  }
};

const getTaskStatus = (column: string) => {
  switch (column) {
    case "To Do":
      return "todo";
    case "In Progress":
      return "inProgress";
    case "Testing":
      return "testing";
    case "Complete":
      return "complete";
    case "On Hold":
      return "onHold";
    case "Canceled":
      return "canceled";
    case "Reopened":
      return "reopened";
    default:
      return "todo";
  }
};

export const getKanbanBoard = async (listId: string) => {
  const kanbanBoard = await kanbanRepository.findOne({
    where: { list: { id: listId } },
    relations: ["columns"],
  });
  if (!kanbanBoard) {
    throw new Error("Kanban board not found");
  }

  const tasks = await taskRepository.find({
    where: { list: { id: listId } },
    relations: ["assignees"],
  });

  const columnsResponse: any = {};
  kanbanBoard.columns.forEach((column) => {
    columnsResponse[`${column.id}`] = {
      id: `${column.id}`,
      name: column.name,
      taskIds: tasks
        .filter((task) => getTaskColumn(task.status) === column.name)
        .map((task) => `${task.id}`),
    };
  });

  const tasksResponse: any = {};

  await Promise.all(
    tasks.map(async (task) => {
      const reporter = await userRepository.findOne({
        where: { id: task.reporterId },
      });
      tasksResponse[`${task.id}`] = {
        ...task,
        assignees: task.assignees.map((assignee) => ({
          id: assignee.id,
          name: assignee.name,
          email: assignee.email,
          avatarUrl: assignee.photo,
          role: assignee.role,
        })),
        reporter: {
          id: reporter?.id,
          name: reporter?.name,
          email: reporter?.email,
          avatarUrl: reporter?.photo,
        },
      };
    })
  );

  const orderedResponse = kanbanBoard.columns
    .sort((a, b) => a.order - b.order)
    .map((column) => `${column.id}`);

  return {
    board: {
      columns: columnsResponse,
      tasks: tasksResponse,
      ordered: orderedResponse,
    },
  };
};

export const moveTask = async (updateColumns: any) => {
  let listId: any;
  Object.keys(updateColumns).forEach(async (column: string) => {
    const { id, name, taskIds } = updateColumns[column];
    await Promise.all(
      taskIds.map(async (taskId: string, index: number) => {
        const task = await taskRepository.findOne({ where: { id: taskId } });
        if (!task) {
          throw new Error("Task not found");
        }
        listId = task?.list?.id;
        await taskRepository.update(taskId, {
          status: getTaskStatus(name) as QueryDeepPartialEntity<TaskStatus>,
        });
      })
    );
  });
  const res = await getKanbanBoard(listId);
  return res;
};
