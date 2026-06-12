import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit, Pause, Play, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobActionsMenuProps {
  jobId: string;
  active: boolean;
  onEdit: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
  onManageApplicants: () => void;
}

export function JobActionsMenu({ jobId, active, onEdit, onTogglePause, onDelete, onManageApplicants }: JobActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-50" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-white border border-white/10 hover:border-white/20"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-900 border border-white/10 rounded-lg shadow-xl p-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-white/5 rounded-md"
          >
            <Edit className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onManageApplicants();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-white/5 rounded-md"
          >
            <Users className="h-3.5 w-3.5" /> Manage Applicants
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePause();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-white/5 rounded-md"
          >
            {active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {active ? "Pause" : "Resume"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setIsOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/50 rounded-md"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
