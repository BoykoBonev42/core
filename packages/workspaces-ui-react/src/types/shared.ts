export interface WorkspaceLoadingAnimationProps {
    workspaceId: string;
}

export interface WorkspaceContentsProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
    workspaceId: string;
    frameId?: string;
    containerElement?: HTMLElement;
}