import { MoreVertical, Edit, Pause, Play, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface JobActionsMenuProps {
  jobId: string;
  active: boolean;
  onEdit: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
  onManageApplicants: () => void;
}

export function JobActionsMenu({ jobId, active, onEdit, onTogglePause, onDelete, onManageApplicants }: JobActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-white border border-white/10 hover:border-white/20 data-[open]:bg-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      } />

      <DropdownMenuContent className="bg-slate-900 border-white/10 shadow-xl min-w-[180px]">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer outline-none"
        >
          <Edit className="h-3.5 w-3.5" /> Edit
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onManageApplicants();
          }}
          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer outline-none"
        >
          <Users className="h-3.5 w-3.5" /> Manage Applicants
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onTogglePause();
          }}
          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 cursor-pointer outline-none"
        >
          {active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {active ? "Pause" : "Resume"}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/50 cursor-pointer outline-none"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
