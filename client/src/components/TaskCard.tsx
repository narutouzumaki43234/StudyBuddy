import { Task } from "@shared/schema";
import { CheckCircle, Clock, Trash2 } from "lucide-react";
import { useCompleteTask, useDeleteTask } from "@/hooks/use-tasks";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const completeMutation = useCompleteTask();
  const deleteMutation = useDeleteTask();
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Simple countdown logic based on creation time + time limit
  useEffect(() => {
    if (!task.timeLimit || !task.createdAt || task.completed) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const created = new Date(task.createdAt!);
      const deadline = new Date(created.getTime() + task.timeLimit! * 60000);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) return "Time's up!";

      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      return `${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [task]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative group p-4 rounded-xl border border-border/50
        transition-all duration-300
        ${task.completed ? 'bg-muted/30 border-border/30' : 'bg-card shadow-md hover:border-primary/50'}
      `}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm truncate ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {task.timeLimit && !task.completed && (
            <div className={`
              mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono
              ${timeLeft === "Time's up!" ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}
            `}>
              <Clock className="w-3 h-3" />
              <span>{timeLeft}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
           {!task.completed && (
            <button
              onClick={() => completeMutation.mutate(task.id)}
              disabled={completeMutation.isPending}
              className="text-muted-foreground hover:text-primary transition-colors p-1"
              title="Complete Task"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
           )}
           <button
             onClick={() => deleteMutation.mutate(task.id)}
             disabled={deleteMutation.isPending}
             className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-1"
             title="Delete Task"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>
    </motion.div>
  );
}
