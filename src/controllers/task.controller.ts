import { Request, Response } from "express";
import * as taskSerivce from "../services/task.service";
import catchAsync from "../utils/catchAsync";

export const createTask = catchAsync(async (req: Request, res: Response) => {
  const reqBody = req.body;
  reqBody.reporterId = res.locals.user.id;

  const list = await taskSerivce.create(reqBody);
  res.status(201).json(list);
});

export const getAllTasks = catchAsync(async (req: Request, res: Response) => {
  const { listId } = req.params;
  const { page = 1, pageSize = 10, sortBy = "created_at" } = req.query;

  const paginationOptions = {
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string),
    sortBy: sortBy as string,
  };

  const tasks = await taskSerivce.getAllTasksService(
    listId,
    paginationOptions.page,
    paginationOptions.pageSize,
    paginationOptions.sortBy
  );
  res.status(200).json(tasks);
});
