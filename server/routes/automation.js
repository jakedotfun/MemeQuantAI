import { Router } from "express";
import automationEngine from "../services/automationService.js";

const router = Router();

// GET /api/automation/playbooks — List all available playbooks
router.get("/playbooks", (req, res) => {
  const playbooks = automationEngine.getPlaybooks();
  res.json({ success: true, playbooks });
});

// GET /api/automation/:userAddress — Get user's active automations
router.get("/:userAddress", (req, res) => {
  try {
    const automations = automationEngine.getUserAutomations(req.params.userAddress);
    res.json({ success: true, automations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/automation/activate — Activate a playbook
router.post("/activate", (req, res) => {
  try {
    const { userAddress, playbookId, customParams } = req.body;
    if (!userAddress || !playbookId) {
      return res.status(400).json({ error: "userAddress and playbookId required" });
    }

    const result = automationEngine.activatePlaybook(userAddress, playbookId, customParams || {});
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/automation/deactivate — Deactivate a playbook
router.post("/deactivate", (req, res) => {
  try {
    const { userAddress, playbookId } = req.body;
    if (!userAddress || !playbookId) {
      return res.status(400).json({ error: "userAddress and playbookId required" });
    }

    const result = automationEngine.deactivatePlaybook(userAddress, playbookId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/automation/start-monitor — Start monitoring positions
router.post("/start-monitor", (req, res) => {
  try {
    const { userAddress } = req.body;
    if (!userAddress) return res.status(400).json({ error: "userAddress required" });

    const result = automationEngine.startMonitoring(userAddress);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/automation/stop-monitor — Stop monitoring
router.post("/stop-monitor", (req, res) => {
  try {
    automationEngine.stopMonitoring();
    res.json({ success: true, message: "Monitoring stopped" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/automation/activity/:userAddress — Get activity log
router.get("/activity/:userAddress", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const log = automationEngine.getActivityLog(req.params.userAddress, limit);
    res.json({ success: true, activities: log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
