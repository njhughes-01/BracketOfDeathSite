"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const TournamentCreate = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    (0, react_1.useEffect)(() => {
        navigate('/tournaments/setup', { replace: true });
    }, [navigate]);
    return null;
};
exports.default = TournamentCreate;
//# sourceMappingURL=TournamentCreate.js.map