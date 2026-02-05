export interface vmList {
    id: string,
    name: string,
    node: string,
    status: string,
    uptime: number,
    memory_usage: number,
    network_traffic: {
        rx_bytes: number,
        tx_bytes: number
    },
    type: string,
    panelId: number
}

export interface vmStatus {
    id: string,
    node: string,
    type: string,
    name: string,
    status: string,
    uptime: number,
    cpu_usage: number,
    memory_usage: number,
    maxMemory: number,
    disk_usage: number,
    maxDisk: number,
    network_traffic: {
        rx_bytes: number,
        tx_bytes: number
    },
    guestDisk: {
        total: number;
        used: number;
    }
}

export interface RRDDataPoint {
    time: number;
    cpu?: number;
    mem?: number;
    maxmem?: number;
    disk?: number;
    maxdisk?: number;
    netin?: number;
    netout?: number;
}

export interface PanelSimpleInfo {
    id: number;
    name: string,
    type: string,
    apiUrl: string,
    active: boolean,
    isDefault: boolean
}