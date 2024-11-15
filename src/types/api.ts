/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface GithubComNaibaNezhaModelCommonResponseAny {
  data: any;
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelAlertRule {
  data: ModelAlertRule[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelCron {
  data: ModelCron[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelDDNSProfile {
  data: ModelDDNSProfile[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelNAT {
  data: ModelNAT[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelNotification {
  data: ModelNotification[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelNotificationGroupResponseItem {
  data: ModelNotificationGroupResponseItem[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelServer {
  data: ModelServer[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelServerGroupResponseItem {
  data: ModelServerGroupResponseItem[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelServiceInfos {
  data: ModelServiceInfos[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayModelUser {
  data: ModelUser[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayString {
  data: string[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseArrayUint64 {
  data: number[];
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseModelConfig {
  data: ModelConfig;
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseModelLoginResponse {
  data: ModelLoginResponse;
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseModelServiceResponse {
  data: ModelServiceResponse;
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseModelUser {
  data: ModelUser;
  error: string;
  success: boolean;
}

export interface GithubComNaibaNezhaModelCommonResponseUint64 {
  data: number;
  error: string;
  success: boolean;
}

export interface GormDeletedAt {
  time?: string;
  /** Valid is true if Time is not NULL */
  valid?: boolean;
}

export interface ModelAlertRule {
  created_at: string;
  deleted_at: GormDeletedAt;
  enable: boolean;
  /** 失败时执行的触发任务id */
  fail_trigger_tasks: number[];
  id: number;
  name: string;
  /** 该报警规则所在的通知组 */
  notification_group_id: number;
  /** 恢复时执行的触发任务id */
  recover_trigger_tasks: number[];
  rules: ModelRule[];
  /** 触发模式: 0-始终触发(默认) 1-单次触发 */
  trigger_mode: number;
  updated_at: string;
}

export interface ModelAlertRuleForm {
  enable: boolean;
  /** 失败时触发的任务id */
  fail_trigger_tasks: number[];
  name: string;
  notification_group_id: number;
  /** 恢复时触发的任务id */
  recover_trigger_tasks: number[];
  rules: ModelRule[];
  trigger_mode: number;
}

export interface ModelConfig {
  agent_secret_key: string;
  avg_ping_count: number;
  /** 覆盖范围（0:提醒未被 IgnoredIPNotification 包含的所有服务器; 1:仅提醒被 IgnoredIPNotification 包含的服务器;） */
  cover: number;
  custom_code: string;
  custom_code_dashboard: string;
  /** debug模式开关 */
  debug: boolean;
  dns_servers: string;
  /** IP变更提醒 */
  enable_ip_change_notification: boolean;
  /** 通知信息IP不打码 */
  enable_plain_ip_in_notification: boolean;
  /** 特定服务器IP（多个服务器用逗号分隔） */
  ignored_ip_notification: string;
  /** [ServerID] -> bool(值为true代表当前ServerID在特定服务器列表内） */
  ignored_ip_notification_server_ids: Record<string, boolean>;
  install_host: string;
  ip_change_notification_group_id: number;
  jwt_secret_key: string;
  /** 系统语言，默认 zh_CN */
  language: string;
  listen_port: number;
  /** 时区，默认为 Asia/Shanghai */
  location: string;
  site_name: string;
  tls: boolean;
}

export interface ModelCreateFMResponse {
  session_id: string;
}

export interface ModelCreateTerminalResponse {
  server_id: number;
  server_name: string;
  session_id: string;
}

export interface ModelCron {
  command: string;
  /** 计划任务覆盖范围 (0:仅覆盖特定服务器 1:仅忽略特定服务器 2:由触发该计划任务的服务器执行) */
  cover: number;
  created_at: string;
  cron_job_id: number;
  deleted_at: GormDeletedAt;
  id: number;
  /** 最后一次执行时间 */
  last_executed_at: string;
  /** 最后一次执行结果 */
  last_result: boolean;
  name: string;
  /** 指定通知方式的分组 */
  notification_group_id: number;
  /** 推送成功的通知 */
  push_successful: boolean;
  /** 分钟 小时 天 月 星期 */
  scheduler: string;
  servers: number[];
  /** 0:计划任务 1:触发任务 */
  task_type: number;
  updated_at: string;
}

export interface ModelCronForm {
  command: string;
  cover: number;
  id: number;
  name: string;
  notification_group_id: number;
  push_successful: boolean;
  scheduler: string;
  servers: number[];
  /** 0:计划任务 1:触发任务 */
  task_type: number;
}

export interface ModelCycleTransferStats {
  from?: string;
  max?: number;
  min?: number;
  name?: string;
  nextUpdate?: Record<string, string>;
  serverName?: Record<string, string>;
  to?: string;
  transfer?: Record<string, number>;
}

export interface ModelDDNSForm {
  access_id: string;
  access_secret: string;
  domains: string[];
  enable_ipv4: boolean;
  enable_ipv6: boolean;
  max_retries: number;
  name: string;
  provider: string;
  webhook_headers: string;
  webhook_method: number;
  webhook_request_body: string;
  webhook_request_type: number;
  webhook_url: string;
}

export interface ModelDDNSProfile {
  access_id: string;
  access_secret: string;
  created_at: string;
  deleted_at: GormDeletedAt;
  domains: string[];
  enable_ipv4: boolean;
  enable_ipv6: boolean;
  id: number;
  max_retries: number;
  name: string;
  provider: string;
  updated_at: string;
  webhook_headers: string;
  webhook_method: number;
  webhook_request_body: string;
  webhook_request_type: number;
  webhook_url: string;
}

export interface ModelHost {
  arch: string;
  boot_time: number;
  country_code: string;
  cpu: string[];
  disk_total: number;
  gpu: string[];
  ip: string;
  mem_total: number;
  platform: string;
  platform_version: string;
  swap_total: number;
  version: string;
  virtualization: string;
}

export interface ModelHostState {
  cpu: number;
  disk_used: number;
  gpu: number[];
  load_1: number;
  load_15: number;
  load_5: number;
  mem_used: number;
  net_in_speed: number;
  net_in_transfer: number;
  net_out_speed: number;
  net_out_transfer: number;
  process_count: number;
  swap_used: number;
  tcp_conn_count: number;
  temperatures: ModelSensorTemperature[];
  udp_conn_count: number;
  uptime: number;
}

export interface ModelLoginRequest {
  password: string;
  username: string;
}

export interface ModelLoginResponse {
  expire: string;
  token: string;
}

export interface ModelNAT {
  created_at: string;
  deleted_at: GormDeletedAt;
  domain: string;
  host?: string;
  id: number;
  name?: string;
  serverID?: number;
  updated_at: string;
}

export interface ModelNATForm {
  domain: string;
  host: string;
  name: string;
  server_id: number;
}

export interface ModelNotification {
  created_at: string;
  deleted_at: GormDeletedAt;
  id: number;
  name: string;
  request_body: string;
  request_header: string;
  request_method: number;
  request_type: number;
  updated_at: string;
  url: string;
  verify_tls: boolean;
}

export interface ModelNotificationForm {
  name: string;
  request_body: string;
  request_header: string;
  request_method: number;
  request_type: number;
  skip_check: boolean;
  url: string;
  verify_tls: boolean;
}

export interface ModelNotificationGroup {
  created_at: string;
  deleted_at: GormDeletedAt;
  id: number;
  name: string;
  updated_at: string;
}

export interface ModelNotificationGroupForm {
  name: string;
  notifications: number[];
}

export interface ModelNotificationGroupResponseItem {
  group: ModelNotificationGroup;
  notifications: number[];
}

export interface ModelRule {
  /** 覆盖范围 RuleCoverAll/IgnoreAll */
  cover: number;
  /** 流量统计周期 */
  cycle_interval: number;
  /** 流量统计的开始时间 */
  cycle_start: string;
  /** 流量统计周期单位，默认hour,可选(hour, day, week, month, year) */
  cycle_unit: string;
  /** 持续时间 (秒) */
  duration: number;
  /** 覆盖范围的排除 */
  ignore: Record<string, boolean>;
  /** 最大阈值 (百分比、字节 kb ÷ 1024) */
  max: number;
  /** 最小阈值 (百分比、字节 kb ÷ 1024) */
  min: number;
  /**
   * 指标类型，cpu、memory、swap、disk、net_in_speed、net_out_speed
   * net_all_speed、transfer_in、transfer_out、transfer_all、offline
   * transfer_in_cycle、transfer_out_cycle、transfer_all_cycle
   */
  type: string;
}

export interface ModelSensorTemperature {
  name?: string;
  temperature?: number;
}

export interface ModelServer {
  created_at: string;
  /** DDNS配置 */
  ddns_profiles: number[];
  deleted_at: GormDeletedAt;
  /** 展示排序，越大越靠前 */
  display_index: number;
  /** 启用DDNS */
  enable_ddns: boolean;
  /** 对游客隐藏 */
  hide_for_guest: boolean;
  host: ModelHost;
  id: number;
  last_active: string;
  name: string;
  /** 管理员可见备注 */
  note: string;
  /** 公开备注 */
  public_note: string;
  state: ModelHostState;
  updated_at: string;
  uuid: string;
}

export interface ModelServerForm {
  /** DDNS配置 */
  ddns_profiles: number[];
  /** 展示排序，越大越靠前 */
  display_index: number;
  /** 启用DDNS */
  enable_ddns: boolean;
  /** 对游客隐藏 */
  hide_for_guest: boolean;
  name: string;
  /** 管理员可见备注 */
  note: string;
  /** 公开备注 */
  public_note: string;
}

export interface ModelServerGroup {
  created_at: string;
  deleted_at: GormDeletedAt;
  id: number;
  name: string;
  updated_at: string;
}

export interface ModelServerGroupForm {
  name: string;
  servers: number[];
}

export interface ModelServerGroupResponseItem {
  group: ModelServerGroup;
  servers: number[];
}

export interface ModelService {
  cover: number;
  created_at: string;
  deleted_at: GormDeletedAt;
  duration: number;
  enable_show_in_service: boolean;
  enable_trigger_task: boolean;
  /** 失败时执行的触发任务id */
  fail_trigger_tasks: number[];
  id: number;
  latency_notify: boolean;
  max_latency: number;
  min_latency: number;
  name: string;
  /** 当前服务监控所属的通知组 ID */
  notification_group_id: number;
  notify: boolean;
  /** 恢复时执行的触发任务id */
  recover_trigger_tasks: number[];
  skip_servers: Record<string, boolean>;
  target: string;
  type: number;
  updated_at: string;
}

export interface ModelServiceForm {
  cover: number;
  duration: number;
  enable_show_in_service: boolean;
  enable_trigger_task: boolean;
  fail_trigger_tasks: number[];
  latency_notify: boolean;
  max_latency: number;
  min_latency: number;
  name: string;
  notification_group_id: number;
  notify: boolean;
  recover_trigger_tasks: number[];
  skip_servers: Record<string, boolean>;
  target: string;
  type: number;
}

export interface ModelServiceInfos {
  avg_delay: number[];
  created_at: number[];
  monitor_id: number;
  monitor_name: string;
  server_id: number;
  server_name: string;
}

export interface ModelServiceResponse {
  cycleTransferStats?: Record<string, ModelCycleTransferStats>;
  services?: Record<string, ModelServiceResponseItem>;
}

export interface ModelServiceResponseItem {
  currentDown?: number;
  currentUp?: number;
  delay?: number[];
  down?: number[];
  service?: ModelService;
  totalDown?: number;
  totalUp?: number;
  up?: number[];
}

export interface ModelSettingForm {
  cover: number;
  custom_code: string;
  custom_code_dashboard: string;
  custom_nameservers: string;
  enable_ip_change_notification: boolean;
  enable_plain_ip_in_notification: boolean;
  ignored_ip_notification: string;
  install_host: string;
  /** IP变更提醒的通知组 */
  ip_change_notification_group_id: number;
  language: string;
  site_name: string;
}

export interface ModelStreamServer {
  /** 展示排序，越大越靠前 */
  display_index: number;
  host: ModelHost;
  id: number;
  last_active: string;
  name: string;
  /** 公开备注，只第一个数据包有值 */
  public_note: string;
  state: ModelHostState;
}

export interface ModelStreamServerData {
  now: number;
  servers: ModelStreamServer[];
}

export interface ModelTerminalForm {
  protocol: string;
  server_id: number;
}

export interface ModelUser {
  created_at: string;
  deleted_at: GormDeletedAt;
  id: number;
  password: string;
  updated_at: string;
  username: string;
}

export interface ModelUserForm {
  password: string;
  username: string;
}
