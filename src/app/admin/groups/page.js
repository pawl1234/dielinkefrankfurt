'use client';
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminGroupsPage;
var react_1 = require("react");
var react_2 = require("next-auth/react");
var navigation_1 = require("next/navigation");
var MainLayout_1 = require("@/components/MainLayout");
var material_1 = require("@mui/material");
var Search_1 = require("@mui/icons-material/Search");
var Clear_1 = require("@mui/icons-material/Clear");
var Sort_1 = require("@mui/icons-material/Sort");
var CheckCircle_1 = require("@mui/icons-material/CheckCircle");
var Visibility_1 = require("@mui/icons-material/Visibility");
var Edit_1 = require("@mui/icons-material/Edit");
var Delete_1 = require("@mui/icons-material/Delete");
var Group_1 = require("@mui/icons-material/Group");
var Archive_1 = require("@mui/icons-material/Archive");
var Event_1 = require("@mui/icons-material/Event");
var MailOutline_1 = require("@mui/icons-material/MailOutline");
var date_fns_1 = require("date-fns");
var locale_1 = require("date-fns/locale");
var link_1 = require("next/link");
function AdminGroupsPage() {
    var _this = this;
    var _a = (0, react_2.useSession)(), session = _a.data, status = _a.status;
    var router = (0, navigation_1.useRouter)();
    var _b = (0, react_1.useState)([]), groups = _b[0], setGroups = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(null), error = _d[0], setError = _d[1];
    var _e = (0, react_1.useState)(0), tabValue = _e[0], setTabValue = _e[1];
    var _f = (0, react_1.useState)(''), searchTerm = _f[0], setSearchTerm = _f[1];
    var _g = (0, react_1.useState)('name'), sortField = _g[0], setSortField = _g[1];
    var _h = (0, react_1.useState)('asc'), sortDirection = _h[0], setSortDirection = _h[1];
    var _j = (0, react_1.useState)(false), deleteDialogOpen = _j[0], setDeleteDialogOpen = _j[1];
    var _k = (0, react_1.useState)(null), groupToDelete = _k[0], setGroupToDelete = _k[1];
    var _l = (0, react_1.useState)(false), statusDialogOpen = _l[0], setStatusDialogOpen = _l[1];
    var _m = (0, react_1.useState)(null), groupToChangeStatus = _m[0], setGroupToChangeStatus = _m[1];
    var _o = (0, react_1.useState)(null), statusUpdateMessage = _o[0], setStatusUpdateMessage = _o[1];
    // Pagination state
    var _p = (0, react_1.useState)(1), page = _p[0], setPage = _p[1];
    var _q = (0, react_1.useState)(9), pageSize = _q[0], setPageSize = _q[1]; // 9 items per page for 3x3 grid
    var _r = (0, react_1.useState)(0), totalItems = _r[0], setTotalItems = _r[1];
    var _s = (0, react_1.useState)(0), totalPages = _s[0], setTotalPages = _s[1];
    // Define status types
    var statusValues = ['NEW', 'ACTIVE', 'ARCHIVED'];
    var statusLabels = {
        'NEW': 'Neue Anfragen',
        'ACTIVE': 'Aktive Gruppen',
        'ARCHIVED': 'Archiv'
    };
    (0, react_1.useEffect)(function () {
        // Redirect if not authenticated
        if (status === 'unauthenticated') {
            router.push('/admin/login');
        }
    }, [status, router]);
    // Add a timestamp state for cache busting
    var _t = (0, react_1.useState)(function () { return Date.now(); }), timestamp = _t[0], setTimestamp = _t[1];
    (0, react_1.useEffect)(function () {
        // Fetch groups when authenticated
        if (status === 'authenticated') {
            fetchGroups();
        }
    }, [status, tabValue, searchTerm, sortField, sortDirection, page, pageSize, timestamp]);
    // Reset to page 1 when filters change
    (0, react_1.useEffect)(function () {
        setPage(1);
    }, [tabValue, searchTerm, sortField, sortDirection]);
    var fetchGroups = function () { return __awaiter(_this, void 0, void 0, function () {
        var selectedStatus, params, response, data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, 4, 5]);
                    setLoading(true);
                    selectedStatus = statusValues[tabValue];
                    params = new URLSearchParams();
                    params.append('status', selectedStatus);
                    if (searchTerm) {
                        params.append('search', searchTerm);
                    }
                    params.append('orderBy', sortField);
                    params.append('orderDirection', sortDirection);
                    params.append('page', page.toString());
                    params.append('pageSize', pageSize.toString());
                    params.append('t', Date.now().toString()); // Cache busting
                    return [4 /*yield*/, fetch("/api/admin/groups?".concat(params.toString()))];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error('Failed to fetch groups');
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    setGroups(data.groups);
                    setTotalItems(data.totalItems || 0);
                    setTotalPages(data.totalPages || 1);
                    setError(null);
                    // Adjust page if current page is higher than total pages
                    if (data.totalPages && data.totalPages > 0 && page > data.totalPages) {
                        setPage(data.totalPages);
                    }
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    setError('Failed to load groups. Please try again.');
                    console.error(err_1);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleTabChange = function (_, newValue) {
        setTabValue(newValue);
    };
    var handleSearchChange = function (event) {
        setSearchTerm(event.target.value);
    };
    var handleClearSearch = function () {
        setSearchTerm('');
    };
    var handleSortChange = function (field) {
        // Toggle direction if same field, otherwise set to asc
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortField(field);
            setSortDirection('asc');
        }
    };
    var handleGroupAction = function (action, group) {
        switch (action) {
            case 'view':
                router.push("/admin/groups/".concat(group.id));
                break;
            case 'edit':
                router.push("/admin/groups/".concat(group.id, "/edit"));
                break;
            case 'delete':
                setGroupToDelete(group.id);
                setDeleteDialogOpen(true);
                break;
            case 'activate':
                setGroupToChangeStatus({ id: group.id, status: 'ACTIVE' });
                setStatusDialogOpen(true);
                break;
            case 'archive':
                setGroupToChangeStatus({ id: group.id, status: 'ARCHIVED' });
                setStatusDialogOpen(true);
                break;
        }
    };
    var handleDeleteGroup = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, jsonError_1, errorMessage, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!groupToDelete)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, 8, 9]);
                    setLoading(true);
                    return [4 /*yield*/, fetch("/api/admin/groups/".concat(groupToDelete), {
                            method: 'DELETE',
                        })];
                case 2:
                    response = _a.sent();
                    data = void 0;
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, response.json()];
                case 4:
                    data = _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    jsonError_1 = _a.sent();
                    console.error('Error parsing response JSON:', jsonError_1);
                    throw new Error('Failed to parse server response');
                case 6:
                    if (!response.ok || (data && !data.success)) {
                        errorMessage = (data && data.error) ? data.error : 'Failed to delete group';
                        throw new Error(errorMessage);
                    }
                    // Success - refresh groups and show message
                    setTimestamp(Date.now());
                    setStatusUpdateMessage({
                        type: 'success',
                        message: 'Gruppe wurde erfolgreich gelöscht.'
                    });
                    setTimeout(function () {
                        setStatusUpdateMessage(null);
                    }, 5000);
                    return [3 /*break*/, 9];
                case 7:
                    err_2 = _a.sent();
                    setStatusUpdateMessage({
                        type: 'error',
                        message: err_2 instanceof Error ? err_2.message : 'Fehler beim Löschen der Gruppe.'
                    });
                    console.error('Error deleting group:', err_2);
                    return [3 /*break*/, 9];
                case 8:
                    setDeleteDialogOpen(false);
                    setGroupToDelete(null);
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var handleUpdateGroupStatus = function () { return __awaiter(_this, void 0, void 0, function () {
        var requestBody, response, responseText, textError_1, data, errorMessage, errorMatch, fetchError_1, statusAction, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!groupToChangeStatus)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, 11, 12]);
                    setLoading(true);
                    console.log("Updating group ".concat(groupToChangeStatus.id, " status to ").concat(groupToChangeStatus.status));
                    requestBody = JSON.stringify({ status: groupToChangeStatus.status });
                    console.log("Request body:", requestBody);
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 8, , 9]);
                    return [4 /*yield*/, fetch("/api/admin/groups/".concat(groupToChangeStatus.id, "/status"), {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: requestBody,
                        })];
                case 3:
                    response = _a.sent();
                    // Log all response headers for debugging
                    console.log("Response headers:");
                    response.headers.forEach(function (value, key) {
                        console.log("".concat(key, ": ").concat(value));
                    });
                    // Log the HTTP status
                    console.log("Response status: ".concat(response.status, " ").concat(response.statusText));
                    responseText = "";
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, response.text()];
                case 5:
                    responseText = _a.sent();
                    console.log("Raw response:", responseText);
                    return [3 /*break*/, 7];
                case 6:
                    textError_1 = _a.sent();
                    console.error("Failed to read response text:", textError_1);
                    return [3 /*break*/, 7];
                case 7:
                    data = null;
                    if (responseText && responseText.trim()) {
                        try {
                            data = JSON.parse(responseText);
                            console.log("Parsed JSON data:", data);
                        }
                        catch (jsonError) {
                            console.warn("Not valid JSON response:", jsonError);
                            // Not throwing error here, we'll handle it below
                        }
                    }
                    // Response handling decision tree
                    if (response.ok) {
                        // Even if we couldn't parse JSON, treat 2xx status as success
                        console.log("Response OK, treating as success");
                        // If we do have parsed data and it explicitly says not success, log warning
                        if (data && data.success === false) {
                            console.warn("API returned OK status but success=false in body");
                        }
                        // Always continue with success flow for 2xx responses
                        // This is a workaround for API inconsistencies
                    }
                    else {
                        errorMessage = "Unknown server error";
                        if (data && data.error) {
                            errorMessage = data.error;
                        }
                        else if (responseText) {
                            errorMatch = responseText.match(/<pre>(.*?)<\/pre>/s) ||
                                responseText.match(/Error: (.*?)(?:<br|$)/);
                            if (errorMatch && errorMatch[1]) {
                                errorMessage = errorMatch[1].trim();
                            }
                            else {
                                errorMessage = "HTTP ".concat(response.status, ": ").concat(response.statusText);
                            }
                        }
                        console.error("Error updating group status:", errorMessage);
                        throw new Error(errorMessage);
                    }
                    return [3 /*break*/, 9];
                case 8:
                    fetchError_1 = _a.sent();
                    if (fetchError_1 instanceof Error) {
                        console.error("Fetch operation failed:", fetchError_1.message);
                        throw fetchError_1; // Re-throw to be caught by the outer catch
                    }
                    else {
                        console.error("Unknown fetch error:", fetchError_1);
                        throw new Error("Network error occurred");
                    }
                    return [3 /*break*/, 9];
                case 9:
                    // Success - refresh groups and show message
                    setTimestamp(Date.now());
                    statusAction = groupToChangeStatus.status === 'ACTIVE'
                        ? 'aktiviert'
                        : groupToChangeStatus.status === 'ARCHIVED'
                            ? 'archiviert'
                            : 'abgelehnt';
                    setStatusUpdateMessage({
                        type: 'success',
                        message: "Gruppe wurde erfolgreich ".concat(statusAction, ".")
                    });
                    setTimeout(function () {
                        setStatusUpdateMessage(null);
                    }, 5000);
                    return [3 /*break*/, 12];
                case 10:
                    err_3 = _a.sent();
                    setStatusUpdateMessage({
                        type: 'error',
                        message: err_3 instanceof Error ? err_3.message : 'Fehler beim Aktualisieren des Gruppenstatus.'
                    });
                    console.error('Error updating group status:', err_3);
                    return [3 /*break*/, 12];
                case 11:
                    setStatusDialogOpen(false);
                    setGroupToChangeStatus(null);
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    }); };
    // Get the status name for the dialog
    var getStatusAction = function (status) {
        if (!status)
            return '';
        switch (status) {
            case 'ACTIVE': return 'aktivieren';
            case 'ARCHIVED': return 'archivieren';
            default: return '';
        }
    };
    if (status === 'loading' || status === 'unauthenticated') {
        return (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <material_1.CircularProgress />
      </material_1.Box>);
    }
    return (<MainLayout_1.MainLayout breadcrumbs={[
            { label: 'Start', href: '/' },
            { label: 'Administration', href: '/admin' },
            { label: 'Gruppen', href: '/admin/groups', active: true },
        ]}>
      <material_1.Box sx={{ flexGrow: 1 }}>
        <material_1.Container maxWidth="lg" sx={{ mt: 4, mb: 2 }}>
          {/* Admin Navigation */}
          <material_1.Paper sx={{ p: 2, mb: 4 }}>
            <material_1.Typography variant="h6" gutterBottom>
              Admin Dashboard
            </material_1.Typography>
            <material_1.Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <material_1.Button variant="outlined" color="primary" startIcon={<Event_1.default />} component={link_1.default} href="/admin">
                Termine
              </material_1.Button>
              <material_1.Button variant="contained" color="primary" startIcon={<Group_1.default />} component={link_1.default} href="/admin/groups" sx={{ fontWeight: 'bold' }}>
                Gruppen
              </material_1.Button>
              <material_1.Button variant="outlined" color="primary" startIcon={<MailOutline_1.default />} component={link_1.default} href="/admin/status-reports">
                Status Reports
              </material_1.Button>
            </material_1.Box>
          </material_1.Paper>
          
          <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <material_1.Typography variant="h4" component="h1" gutterBottom>
              <Group_1.default sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Gruppen verwalten
            </material_1.Typography>
          </material_1.Box>
          
          {statusUpdateMessage && (<material_1.Alert severity={statusUpdateMessage.type} sx={{ mb: 3 }} onClose={function () { return setStatusUpdateMessage(null); }}>
              {statusUpdateMessage.message}
            </material_1.Alert>)}

          <material_1.Paper sx={{ p: 0, mb: 3 }}>
            <material_1.Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
              {statusValues.map(function (status, index) { return (<material_1.Tab key={status} label={statusLabels[status]}/>); })}
            </material_1.Tabs>
          </material_1.Paper>

          <material_1.Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <material_1.TextField label="Gruppen durchsuchen" variant="outlined" size="small" value={searchTerm} onChange={handleSearchChange} sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: '50%' } }} InputProps={{
            startAdornment: (<material_1.InputAdornment position="start">
                    <Search_1.default />
                  </material_1.InputAdornment>),
            endAdornment: searchTerm ? (<material_1.InputAdornment position="end">
                    <material_1.IconButton size="small" onClick={handleClearSearch}>
                      <Clear_1.default />
                    </material_1.IconButton>
                  </material_1.InputAdornment>) : null,
        }}/>

            <material_1.Box sx={{ display: 'flex', gap: 1 }}>
              <material_1.Tooltip title="Nach Name sortieren">
                <material_1.Button variant={sortField === 'name' ? 'contained' : 'outlined'} color="primary" size="small" startIcon={<Sort_1.default />} onClick={function () { return handleSortChange('name'); }} endIcon={sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}>
                  Name
                </material_1.Button>
              </material_1.Tooltip>
              
              <material_1.Tooltip title="Nach Erstellungsdatum sortieren">
                <material_1.Button variant={sortField === 'createdAt' ? 'contained' : 'outlined'} color="primary" size="small" startIcon={<Sort_1.default />} onClick={function () { return handleSortChange('createdAt'); }} endIcon={sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}>
                  Datum
                </material_1.Button>
              </material_1.Tooltip>
            </material_1.Box>
          </material_1.Box>

          {loading ? (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <material_1.CircularProgress />
            </material_1.Box>) : error ? (<material_1.Paper sx={{ p: 3, textAlign: 'center' }}>
              <material_1.Typography color="error">{error}</material_1.Typography>
            </material_1.Paper>) : groups.length === 0 ? (<material_1.Paper sx={{ p: 5, textAlign: 'center' }}>
              <material_1.Typography variant="h6" color="text.secondary">
                Keine {statusLabels[statusValues[tabValue]].toLowerCase()} gefunden.
              </material_1.Typography>
            </material_1.Paper>) : (<material_1.Grid container spacing={3}>
              {groups.map(function (group) { return (<material_1.Grid key={group.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <material_1.Card variant="outlined" sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: 3,
                    borderLeftColor: function () {
                        switch (group.status) {
                            case 'NEW': return 'info.main';
                            case 'ACTIVE': return 'success.main';
                            case 'ARCHIVED': return 'text.disabled';
                            default: return 'grey.500';
                        }
                    }
                }}>
                    <material_1.CardContent sx={{ flexGrow: 1 }}>
                      <material_1.Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <material_1.Chip label={(function () {
                    switch (group.status) {
                        case 'NEW': return 'Neu';
                        case 'ACTIVE': return 'Aktiv';
                        case 'ARCHIVED': return 'Archiviert';
                        default: return group.status;
                    }
                })()} size="small" color={(function () {
                    switch (group.status) {
                        case 'NEW': return 'info';
                        case 'ACTIVE': return 'success';
                        case 'ARCHIVED': return 'default';
                        default: return 'default';
                    }
                })()}/>
                        <material_1.Typography variant="caption" color="text.secondary">
                          {(0, date_fns_1.format)(new Date(group.createdAt), 'dd.MM.yyyy', { locale: locale_1.de })}
                        </material_1.Typography>
                      </material_1.Box>
                      
                      <material_1.Typography variant="h6" component="h2" gutterBottom noWrap>
                        {group.name}
                      </material_1.Typography>
                      
                      <material_1.Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 1,
                    height: 100,
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                        {group.logoUrl ? (<material_1.Box component="img" src={group.logoUrl} alt={group.name} sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: 1
                    }}/>) : (<material_1.Box sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.100',
                        borderRadius: 1
                    }}>
                            <Group_1.default sx={{ fontSize: 40, color: 'grey.400' }}/>
                          </material_1.Box>)}
                      </material_1.Box>
                      
                      <material_1.Typography variant="body2" color="text.secondary" sx={{
                    mb: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.5
                }}>
                        {group.description.length > 150
                    ? "".concat(group.description.substring(0, 150), "...")
                    : group.description}
                      </material_1.Typography>
                    </material_1.CardContent>
                    
                    <material_1.Divider />
                    
                    <material_1.CardActions sx={{ p: 1.5, gap: 0.5, flexWrap: 'wrap' }}>
                      <material_1.Button size="small" startIcon={<Visibility_1.default />} onClick={function () { return handleGroupAction('view', group); }}>
                        Details
                      </material_1.Button>
                      
                      <material_1.Button size="small" startIcon={<Edit_1.default />} onClick={function () { return handleGroupAction('edit', group); }}>
                        Bearbeiten
                      </material_1.Button>
                      
        
                      {group.status === 'NEW' && (<material_1.Button size="small" color="success" startIcon={<CheckCircle_1.default />} onClick={function () { return handleGroupAction('activate', group); }}>
                          Aktivieren
                        </material_1.Button>)}
                      
                      
                      {group.status === 'ACTIVE' && (<material_1.Button size="small" color="warning" startIcon={<Archive_1.default />} onClick={function () { return handleGroupAction('archive', group); }}>
                          Archivieren
                        </material_1.Button>)}
                      
                      {group.status === 'ARCHIVED' && (<material_1.Button size="small" color="error" startIcon={<Delete_1.default />} onClick={function () { return handleGroupAction('delete', group); }}>
                          Löschen
                        </material_1.Button>)}
                    </material_1.CardActions>
                  </material_1.Card>
                </material_1.Grid>); })}
            </material_1.Grid>)}{totalPages > 1 && (<material_1.Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <material_1.Button disabled={page <= 1} onClick={function () { return setPage(function (prev) { return Math.max(prev - 1, 1); }); }} variant="outlined">
                    Vorherige
                  </material_1.Button>
                  
                  <material_1.Typography variant="body1">
                    Seite {page} von {totalPages}
                  </material_1.Typography>
                  
                  <material_1.Button disabled={page >= totalPages} onClick={function () { return setPage(function (prev) { return Math.min(prev + 1, totalPages); }); }} variant="outlined">
                    Nächste
                  </material_1.Button>
                  
                  <material_1.FormControl size="small" sx={{ minWidth: 120 }}>
                    <material_1.InputLabel id="page-size-label">Elemente pro Seite</material_1.InputLabel>
                    <material_1.Select labelId="page-size-label" value={pageSize} label="Elemente pro Seite" onChange={function (e) {
                setPageSize(Number(e.target.value));
                setPage(1); // Reset to first page when changing page size
            }}>
                      <material_1.MenuItem value={6}>6</material_1.MenuItem>
                      <material_1.MenuItem value={9}>9</material_1.MenuItem>
                      <material_1.MenuItem value={12}>12</material_1.MenuItem>
                      <material_1.MenuItem value={24}>24</material_1.MenuItem>
                    </material_1.Select>
                  </material_1.FormControl>
                </material_1.Box>
              </material_1.Box>)}
          {'}'}
        </material_1.Container>
      </material_1.Box>

      {/* Delete confirmation dialog */}
      <material_1.Dialog open={deleteDialogOpen} onClose={function () { return setDeleteDialogOpen(false); }}>
        <material_1.DialogTitle>Gruppe löschen</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText>
            Sind Sie sicher, dass Sie diese Gruppe löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </material_1.DialogContentText>
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={function () { return setDeleteDialogOpen(false); }}>Abbrechen</material_1.Button>
          <material_1.Button onClick={handleDeleteGroup} color="error" variant="contained" startIcon={<Delete_1.default />}>
            Löschen
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>

      {/* Status change confirmation dialog */}
      <material_1.Dialog open={statusDialogOpen} onClose={function () { return setStatusDialogOpen(false); }}>
        <material_1.DialogTitle>Gruppenstatus ändern</material_1.DialogTitle>
        <material_1.DialogContent>
          <material_1.DialogContentText>
            Sind Sie sicher, dass Sie diese Gruppe {getStatusAction(groupToChangeStatus === null || groupToChangeStatus === void 0 ? void 0 : groupToChangeStatus.status)} möchten?
          </material_1.DialogContentText>
          {(groupToChangeStatus === null || groupToChangeStatus === void 0 ? void 0 : groupToChangeStatus.status) === 'ACTIVE' && (<material_1.Typography component="div" sx={{ mt: 2, fontWeight: 'bold' }}>
              Bei Aktivierung wird eine Benachrichtigungs-E-Mail an die verantwortlichen Personen gesendet.
            </material_1.Typography>)}
        </material_1.DialogContent>
        <material_1.DialogActions>
          <material_1.Button onClick={function () { return setStatusDialogOpen(false); }}>Abbrechen</material_1.Button>
          <material_1.Button onClick={handleUpdateGroupStatus} color={(groupToChangeStatus === null || groupToChangeStatus === void 0 ? void 0 : groupToChangeStatus.status) === 'ACTIVE' ? 'success' :
            'warning'} variant="contained" startIcon={(groupToChangeStatus === null || groupToChangeStatus === void 0 ? void 0 : groupToChangeStatus.status) === 'ACTIVE' ? <CheckCircle_1.default /> :
            <Archive_1.default />}>
            {(groupToChangeStatus === null || groupToChangeStatus === void 0 ? void 0 : groupToChangeStatus.status) === 'ACTIVE'
            ? 'Aktivieren'
            : 'Archivieren'}
          </material_1.Button>
        </material_1.DialogActions>
      </material_1.Dialog>
    </MainLayout_1.MainLayout>);
}
