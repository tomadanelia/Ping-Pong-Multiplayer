import { PlayerId, PlayerInfo } from "@shared/types";

export class PlayerService {
    private playerData = new Map<PlayerId, PlayerInfo>();

    public addPlayer(id: PlayerId, name: string): PlayerInfo {
    const playerInfo: PlayerInfo = {
            id,
            name,
        };
       this.playerData.set(id, playerInfo);
        return playerInfo;
    }

 public getPlayer(id: PlayerId): PlayerInfo | undefined {
        return this.playerData.get(id);
    }

 public getAllPlayers(): PlayerInfo[] {
        return Array.from(this.playerData.values());
    }

public removePlayer(id: PlayerId): void {
        this.playerData.delete(id);
    }
}

export const playerService = new PlayerService();