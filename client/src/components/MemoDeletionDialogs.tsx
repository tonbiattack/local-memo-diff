import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type MemoDeletionDialogsProps = {
  deletionTarget: "active" | "all" | null;
  onDeletionOpenChange: (open: boolean) => void;
  deletionTitle: string;
  deletionDescription: string;
  onDeleteMemo: () => void;
  isSnapshotDeletionOpen: boolean;
  onSnapshotDeletionOpenChange: (open: boolean) => void;
  onDeleteSnapshot: () => void;
};

export default function MemoDeletionDialogs(props: MemoDeletionDialogsProps) {
  return (
    <>
      <AlertDialog
        open={props.deletionTarget !== null}
        onOpenChange={props.onDeletionOpenChange}
      >
        <AlertDialogContent className="deletion-dialog">
          <AlertDialogHeader>
            <span className="deletion-dialog-icon">
              <Trash2 size={19} aria-hidden="true" />
            </span>
            <AlertDialogTitle>{props.deletionTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {props.deletionDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="confirm-delete-button"
              onClick={props.onDeleteMemo}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={props.isSnapshotDeletionOpen}
        onOpenChange={props.onSnapshotDeletionOpenChange}
      >
        <AlertDialogContent className="deletion-dialog">
          <AlertDialogHeader>
            <span className="deletion-dialog-icon">
              <Trash2 size={19} aria-hidden="true" />
            </span>
            <AlertDialogTitle>
              スナップショットを削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              この保存履歴は取り消せません。現在のメモは削除されません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="confirm-delete-button"
              onClick={props.onDeleteSnapshot}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
