import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/** A step in a parcel's journey as the courier reported it. `event_key` stops repeats being stored twice. */
@Entity('cod_shipment_event')
export class CodShipmentEvent {
  @PrimaryGeneratedColumn() id: number;
  @Column() tenant_id: number;
  @Column() order_id: number;
  @Column() event_key: string;
  @Column() status: string;
  @Column({ type: Date, nullable: true }) occurred_at: Date | null;
  @Column({ type: 'varchar', nullable: true }) note: string | null;
  @CreateDateColumn() created_at: Date;
}
