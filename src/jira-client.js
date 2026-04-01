const axios = require('axios');

class JiraClient {
  constructor(config = {}) {
    const baseURL = config.JIRA_BASE_URL || process.env.JIRA_BASE_URL;
    if (!baseURL) throw new Error('JIRA_BASE_URL is required');

    const pat = config.JIRA_PAT || process.env.JIRA_PAT;
    const username = config.JIRA_USERNAME || process.env.JIRA_USERNAME;
    const password = config.JIRA_PASSWORD || process.env.JIRA_PASSWORD;

    const headers = { 'Content-Type': 'application/json' };
    const axiosConfig = {
      baseURL,
      headers,
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    };

    // PAT takes priority over basic auth
    if (pat) {
      headers['Authorization'] = `Bearer ${pat}`;
    } else if (username && password) {
      axiosConfig.auth = {
        username,
        password,
      };
    } else {
      throw new Error('Either JIRA_PAT or JIRA_USERNAME/JIRA_PASSWORD required');
    }

    this.client = axios.create(axiosConfig);
    this.pageSize = parseInt(config.PAGE_SIZE || process.env.PAGE_SIZE) || 100;
  }

  async get(url, params = {}) {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  // --- Server Info ---
  async getServerInfo() {
    return this.get('/rest/api/2/serverInfo');
  }

  // --- Projects ---
  async getProjects() {
    return this.get('/rest/api/2/project', { expand: 'description,lead,url,projectKeys' });
  }

  async getProjectComponents(projectKey) {
    return this.get(`/rest/api/2/project/${projectKey}/components`);
  }

  async getProjectVersions(projectKey) {
    return this.get(`/rest/api/2/project/${projectKey}/versions`);
  }

  // --- Issue Search (paginated) ---
  async *searchIssues(jql, fields, expand, initialStartAt = 0) {
    let startAt = initialStartAt;
    const maxResults = this.pageSize;
    const defaultFields = [
      'summary', 'description', 'issuetype', 'status', 'priority',
      'resolution', 'assignee', 'reporter', 'creator', 'labels',
      'components', 'fixVersions', 'versions', 'comment', 'worklog',
      'attachment', 'issuelinks', 'parent', 'environment',
      'timeoriginalestimate', 'timeestimate', 'timespent',
      'duedate', 'created', 'updated', 'resolutiondate',
      'security', 'customfield_*',
    ];

    while (true) {
      const data = await this.get('/rest/api/2/search', {
        jql: jql || 'ORDER BY created ASC',
        startAt,
        maxResults,
        fields: (fields || defaultFields).join(','),
        expand: expand || 'changelog,names',
      });

      yield data;

      startAt += data.issues.length;
      if (startAt >= data.total || data.issues.length === 0) break;
    }
  }

  // --- Users ---
  async searchUsers(startAt = 0, maxResults = 1000) {
    // Jira Server/DC API
    return this.get('/rest/api/2/user/search', {
      username: '.',  // matches all users on Server/DC
      startAt,
      maxResults,
      includeInactive: true,
    });
  }

  // --- Issue Types ---
  async getIssueTypes() {
    return this.get('/rest/api/2/issuetype');
  }

  // --- Statuses ---
  async getStatuses() {
    return this.get('/rest/api/2/status');
  }

  // --- Priorities ---
  async getPriorities() {
    return this.get('/rest/api/2/priority');
  }

  // --- Resolutions ---
  async getResolutions() {
    return this.get('/rest/api/2/resolution');
  }

  // --- Fields ---
  async getFields() {
    return this.get('/rest/api/2/field');
  }

  // --- Boards (Agile) ---
  async *getBoards() {
    let startAt = 0;
    while (true) {
      try {
        const data = await this.get('/rest/agile/1.0/board', {
          startAt,
          maxResults: 50,
        });
        yield data;
        startAt += data.values.length;
        if (startAt >= data.total || data.values.length === 0) break;
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('[WARN] Agile API not available, skipping boards');
          break;
        }
        throw err;
      }
    }
  }

  async getBoardSprints(boardId) {
    const sprints = [];
    let startAt = 0;
    while (true) {
      try {
        const data = await this.get(`/rest/agile/1.0/board/${boardId}/sprint`, {
          startAt,
          maxResults: 50,
        });
        sprints.push(...data.values);
        startAt += data.values.length;
        if (startAt >= data.total || data.values.length === 0) break;
      } catch {
        break;
      }
    }
    return sprints;
  }

  // --- Permission Schemes ---
  async getPermissionSchemes() {
    try {
      return await this.get('/rest/api/2/permissionscheme', { expand: 'permissions,user,group,projectRole,field,all' });
    } catch {
      console.log('[WARN] Cannot access permission schemes');
      return { permissionSchemes: [] };
    }
  }

  // --- Roles ---
  async getRoles() {
    try {
      return await this.get('/rest/api/2/role');
    } catch {
      console.log('[WARN] Cannot access roles');
      return [];
    }
  }

  async getProjectRoleMembers(projectKey, roleId) {
    try {
      return await this.get(`/rest/api/2/project/${projectKey}/role/${roleId}`);
    } catch {
      return null;
    }
  }

  // --- Groups ---
  async getGroups() {
    try {
      return await this.get('/rest/api/2/groups/picker', { maxResults: 1000 });
    } catch {
      console.log('[WARN] Cannot access groups');
      return { groups: [] };
    }
  }

  async getGroupMembers(groupName) {
    const members = [];
    let startAt = 0;
    while (true) {
      try {
        const data = await this.get('/rest/api/2/group/member', {
          groupname: groupName,
          startAt,
          maxResults: 50,
          includeInactiveUsers: true,
        });
        members.push(...data.values);
        startAt += data.values.length;
        if (data.isLast || data.values.length === 0) break;
      } catch {
        break;
      }
    }
    return members;
  }

  // --- Filters ---
  async getFavouriteFilters() {
    try {
      return await this.get('/rest/api/2/filter/favourite');
    } catch {
      return [];
    }
  }

  // --- Dashboards ---
  async getDashboards() {
    try {
      const data = await this.get('/rest/api/2/dashboard', { maxResults: 1000 });
      return data.dashboards || [];
    } catch {
      return [];
    }
  }

  // --- Audit Log ---
  async *getAuditLog(filter = {}) {
    let offset = 0;
    const limit = 1000;
    while (true) {
      try {
        const data = await this.get('/rest/api/2/auditing/record', {
          offset,
          limit,
          ...filter,
        });
        yield data;
        if (!data.records || data.records.length === 0) break;
        offset += data.records.length;
        if (offset >= data.totalCount) break;
      } catch (err) {
        if (err.response && (err.response.status === 403 || err.response.status === 404)) {
          console.log('[WARN] Audit log not accessible (requires admin)');
        } else {
          console.log('[WARN] Audit log error:', err.message);
        }
        break;
      }
    }
  }

  // --- Workflows ---
  async getWorkflows() {
    try {
      return await this.get('/rest/api/2/workflow');
    } catch {
      console.log('[WARN] Cannot access workflows');
      return [];
    }
  }

  // --- Notification Schemes ---
  async getNotificationSchemes() {
    try {
      const data = await this.get('/rest/api/2/notificationscheme', { expand: 'all' });
      return data.values || [];
    } catch {
      console.log('[WARN] Cannot access notification schemes');
      return [];
    }
  }

  // --- Security Schemes ---
  async getSecuritySchemes() {
    try {
      return await this.get('/rest/api/2/issuesecurityschemes');
    } catch {
      console.log('[WARN] Cannot access security schemes');
      return { issueSecuritySchemes: [] };
    }
  }
}

module.exports = JiraClient;
