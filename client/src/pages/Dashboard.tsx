import { DigitalClock } from "@/components/DigitalClock";
import { TaskCard } from "@/components/TaskCard";
import { ChatInterface } from "@/components/ChatInterface";
import { useTasks } from "@/hooks/use-tasks";
import { BookOpen, ListTodo } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const { data: tasks, isLoading } = useTasks();
  const [selectedClass, setSelectedClass] = useState<'9' | '10' | '11' | '12'>('9');

  useEffect(() => {
    const stored = localStorage.getItem('selectedClass');
    if (stored && ['9', '10', '11', '12'].includes(stored)) {
      setSelectedClass(stored as '9' | '10' | '11' | '12');
    } else {
      setSelectedClass('9');
      localStorage.setItem('selectedClass', '9');
    }
  }, []);

  const handleClassChange = (newClass: '9' | '10' | '11' | '12') => {
    setSelectedClass(newClass);
    localStorage.setItem('selectedClass', newClass);
  }

  const activeTasks = tasks?.filter(t => !t.completed) || [];
  const completedTasks = tasks?.filter(t => t.completed) || [];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body text-foreground">
      {/* Left Sidebar - Tasks & Clock */}
      <aside className="hidden lg:flex w-96 flex-col border-r border-border/40 bg-card/30 backdrop-blur-xl relative z-10">
        <div className="p-6 pb-2">
          <DigitalClock />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 custom-scrollbar">
          {/* Active Tasks Section */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="p-1.5 rounded-md bg-accent/20 text-accent">
                <ListTodo className="w-4 h-4" />
              </div>
              <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Current Tasks
              </h3>
              <span className="ml-auto text-xs font-mono bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {activeTasks.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[100px]">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  [1, 2].map(i => (
                    <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                  ))
                ) : activeTasks.length > 0 ? (
                  activeTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-card/20">
                    <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No active tasks</p>
                    <p className="text-xs opacity-70 mt-1">Ask the AI to assign one!</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Completed Tasks Section */}
          {completedTasks.length > 0 && (
            <div>
               <div className="flex items-center gap-2 mb-4 px-1">
                <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  Completed
                </h3>
                <div className="h-px bg-border flex-1" />
              </div>
              <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Class Selector */}
        <div className="p-4 border-t border-border/40 bg-background/50 backdrop-blur-md space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Your Class</p>
          <div className="grid grid-cols-2 gap-2">
            {(['9', '10', '11', '12'] as const).map((cls) => (
              <button
                key={cls}
                onClick={() => handleClassChange(cls)}
                data-testid={`button-class-${cls}`}
                className={`py-2 px-3 rounded-lg font-semibold text-sm transition-colors ${
                  selectedClass === cls
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent/20 hover:text-accent'
                }`}
              >
                Class {cls}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content - Chat */}
      <main className="flex-1 h-full relative z-0">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <ChatInterface />
      </main>
    </div>
  );
}
