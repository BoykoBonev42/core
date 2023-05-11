class Storage {
    public readonly LAST_SESSION_KEY = "g42_workspace_frame_cache";

    public get(key: string) {
        return JSON.parse(sessionStorage.getItem(key));
    }

    public set(key: string, value: object) {
        sessionStorage.setItem(key, JSON.stringify(value));
    }
}

export default new Storage();
