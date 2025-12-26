import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Tasks
  app.get(api.tasks.list.path, async (req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.post(api.tasks.create.path, async (req, res) => {
    try {
      const input = api.tasks.create.input.parse(req.body);
      const task = await storage.createTask(input);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.tasks.complete.path, async (req, res) => {
    const task = await storage.completeTask(Number(req.params.id));
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete(api.tasks.delete.path, async (req, res) => {
    await storage.deleteTask(Number(req.params.id));
    res.status(204).send();
  });

  // Chat
  app.post(api.chat.message.path, async (req, res) => {
    try {
      const { message } = api.chat.message.input.parse(req.body);

      const systemPrompt = `You are a strict but helpful study assistant for students in classes 9-12.
You help them focus and assign them tasks.

When generating assignments or quizzes, format questions using: Q1 - question text, Q2 - question text, etc.
Example:
Q1 - Define photosynthesis
Q2 - What are the two main stages?
Q3 - Name the products of photosynthesis

If you decide to assign a study task based on the conversation, you MUST include a JSON block at the END of your response formatted EXACTLY like this:
$$TASK_JSON$$
{
  "title": "Task Title",
  "description": "Brief description or summary of what to do",
  "timeLimit": 30
}
$$END_TASK_JSON$$
The timeLimit is in minutes. Default to 30-60 for assignments if unsure.
Keep all your questions and content BEFORE the JSON block - only the JSON is removed from display.
Only assign a task if the user asks for one or it fits the study plan. Otherwise, just reply normally.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      });

      const aiContent = completion.choices[0].message.content || "";
      let finalMessage = aiContent;
      let createdTask = undefined;

      // Check for task
      const taskMatch = aiContent.match(/\$\$TASK_JSON\$\$([\s\S]*?)\$\$END_TASK_JSON\$\$/);
      if (taskMatch && taskMatch[1]) {
        try {
          const taskData = JSON.parse(taskMatch[1].trim());
          // Create task in DB
          createdTask = await storage.createTask({
            title: taskData.title,
            description: taskData.description,
            timeLimit: taskData.timeLimit,
            completed: false
          });
          // Remove JSON from message shown to user
          finalMessage = aiContent.replace(taskMatch[0], "").trim();
        } catch (e) {
          console.error("Failed to parse task JSON", e);
        }
      }

      res.json({
        message: finalMessage,
        task: createdTask ? {
          title: createdTask.title,
          description: createdTask.description || "",
          timeLimit: createdTask.timeLimit || 0
        } : undefined
      });

    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to process chat" });
    }
  });

  // Seeding
  if ((await storage.getTasks()).length === 0) {
    await storage.createTask({
      title: "Review Biology Chapter 5",
      description: "Focus on cell division and mitosis.",
      timeLimit: 45,
      completed: false
    });
    await storage.createTask({
      title: "Math Problems: Quadratic Equations",
      description: "Solve exercise 4.2 questions 1-10.",
      timeLimit: 60,
      completed: false
    });
  }

  return httpServer;
}
