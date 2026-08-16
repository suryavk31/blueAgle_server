const { Policy, PolicyVersion } = require('../models');
const { logActivity } = require('../utils/activityLogger');
const { convertHtmlToPolicyJson, compileJsonToHtml } = require('../utils/policyMigration');
const { Op } = require('sequelize');

// ─── Public Policy Endpoints ──────────────────────────────────────────────────

// List all published policies (for footer and nav)
exports.listPublicPolicies = async (req, res) => {
    try {
        const policies = await Policy.findAll({
            where: { status: 'Published' },
            attributes: ['id', 'type', 'title', 'version', 'lastUpdated', 'seoTitle', 'seoDescription', 'seoKeywords', 'canonicalUrl'],
            order: [['title', 'ASC']],
        });
        return res.json(policies);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error loading policies' });
    }
};

// Get single policy by type (public) — returns both content (HTML) and contentJson (Structured JSON)
exports.getPolicyByType = async (req, res) => {
    try {
        const { type } = req.params;
        const policy = await Policy.findOne({
            where: { type, status: 'Published' },
        });

        if (!policy) {
            return res.status(404).json({ message: 'Policy not found or not published' });
        }

        // Auto-generate contentJson on the fly if missing in legacy records
        const result = policy.toJSON();
        if (!result.contentJson && result.content) {
            result.contentJson = convertHtmlToPolicyJson(result.title, result.content);
        }

        return res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error loading policy' });
    }
};

// ─── Admin Policy CMS Endpoints ───────────────────────────────────────────────

// Get policy details for Admin CMS (includes drafts, contentJson, & version history)
exports.getAdminPolicyByType = async (req, res) => {
    try {
        const { type } = req.params;
        const policy = await Policy.findOne({
            where: { type },
            include: [{
                model: PolicyVersion,
                as: 'versions',
                attributes: ['id', 'version', 'title', 'changeSummary', 'createdBy', 'createdAt'],
                order: [['version', 'DESC']],
            }],
        });

        if (!policy) {
            return res.status(404).json({ message: 'Policy not found' });
        }

        const result = policy.toJSON();
        if (!result.contentJson && result.content) {
            result.contentJson = convertHtmlToPolicyJson(result.title, result.content);
        }

        return res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error loading admin policy' });
    }
};

// Update or Create Policy with Version Snapshot (Admin CMS)
exports.upsertPolicy = async (req, res) => {
    try {
        const { type } = req.params;
        const {
            title,
            content,
            contentJson,
            status = 'Published',
            changeSummary = '',
            seoTitle = '',
            seoDescription = '',
            seoKeywords = '',
            canonicalUrl = '',
        } = req.body;

        let finalJson = contentJson;
        let finalHtml = content;

        // If contentJson is provided, compile to HTML fallback
        if (finalJson && typeof finalJson === 'object') {
            finalHtml = compileJsonToHtml(finalJson);
        } else if (finalHtml) {
            // If only HTML provided, parse to contentJson
            finalJson = convertHtmlToPolicyJson(title, finalHtml);
        } else {
            return res.status(400).json({ message: 'Policy content or JSON structure is required' });
        }

        let policy = await Policy.findOne({ where: { type } });
        let newVersionNumber = 1;

        if (policy) {
            newVersionNumber = policy.version + 1;
            await policy.update({
                title: title || policy.title,
                content: finalHtml,
                contentJson: finalJson,
                status,
                version: newVersionNumber,
                lastUpdated: new Date(),
                seoTitle,
                seoDescription,
                seoKeywords,
                canonicalUrl,
            });
        } else {
            policy = await Policy.create({
                type,
                title: title || type.replace('-', ' ').toUpperCase(),
                content: finalHtml,
                contentJson: finalJson,
                status,
                version: 1,
                lastUpdated: new Date(),
                seoTitle,
                seoDescription,
                seoKeywords,
                canonicalUrl,
            });
        }

        // Create version snapshot in PolicyVersion table
        await PolicyVersion.create({
            policyId: policy.id,
            version: newVersionNumber,
            title: policy.title,
            content: finalHtml,
            contentJson: finalJson,
            changeSummary,
            createdBy: req.adminUser?.id || null,
        });

        await logActivity({
            adminUserId: req.adminUser?.id,
            module: 'Policies',
            action: 'Update',
            description: `Updated JSON policy document: ${policy.title} (v${newVersionNumber})`,
            targetId: policy.id,
            req,
        });

        return res.json({
            message: `Policy v${newVersionNumber} saved successfully`,
            policy,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error saving policy' });
    }
};

// Restore previous policy version (Admin CMS)
exports.restorePolicyVersion = async (req, res) => {
    try {
        const { type, versionId } = req.params;

        const policy = await Policy.findOne({ where: { type } });
        if (!policy) return res.status(404).json({ message: 'Policy not found' });

        const targetVersion = await PolicyVersion.findOne({
            where: { id: versionId, policyId: policy.id },
        });

        if (!targetVersion) {
            return res.status(404).json({ message: 'Target policy version not found' });
        }

        const newVersionNumber = policy.version + 1;

        await policy.update({
            title: targetVersion.title,
            content: targetVersion.content,
            contentJson: targetVersion.contentJson || convertHtmlToPolicyJson(targetVersion.title, targetVersion.content),
            version: newVersionNumber,
            lastUpdated: new Date(),
        });

        // Save rollback as new version entry
        await PolicyVersion.create({
            policyId: policy.id,
            version: newVersionNumber,
            title: targetVersion.title,
            content: targetVersion.content,
            contentJson: targetVersion.contentJson,
            changeSummary: `Restored from version ${targetVersion.version}`,
            createdBy: req.adminUser?.id || null,
        });

        await logActivity({
            adminUserId: req.adminUser?.id,
            module: 'Policies',
            action: 'Update',
            description: `Restored policy ${policy.title} to version v${targetVersion.version} (now v${newVersionNumber})`,
            targetId: policy.id,
            req,
        });

        return res.json({
            message: `Restored policy to v${targetVersion.version} (new version v${newVersionNumber})`,
            policy,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error restoring version' });
    }
};

// Validate Policy JSON structure
exports.validatePolicyJson = async (req, res) => {
    try {
        const { json } = req.body;
        if (!json || !Array.isArray(json.sections)) {
            return res.status(400).json({ valid: false, errors: ['Root JSON must contain a "sections" array'] });
        }

        const errors = [];
        const seenSectionIds = new Set();

        json.sections.forEach((sec, sIdx) => {
            if (!sec.id) errors.push(`Section #${sIdx + 1} is missing an 'id'`);
            else if (seenSectionIds.has(sec.id)) errors.push(`Duplicate section ID '${sec.id}' found`);
            else seenSectionIds.add(sec.id);

            if (!sec.title || !sec.title.trim()) errors.push(`Section '${sec.id || sIdx + 1}' has an empty title`);

            if (!Array.isArray(sec.content) || sec.content.length === 0) {
                errors.push(`Section '${sec.title || sec.id}' has no content blocks`);
            } else {
                sec.content.forEach((blk, bIdx) => {
                    if (!blk.type) errors.push(`Block #${bIdx + 1} in section '${sec.title}' is missing a 'type'`);
                    if (blk.type === 'faq' && (!Array.isArray(blk.items) || blk.items.length === 0)) {
                        errors.push(`FAQ Block in '${sec.title}' has no Q&A items`);
                    }
                    if (blk.type === 'table' && (!Array.isArray(blk.rows) || blk.rows.length === 0)) {
                        errors.push(`Table Block in '${sec.title}' has no rows`);
                    }
                });
            }
        });

        return res.json({ valid: errors.length === 0, errors });
    } catch (err) {
        return res.status(400).json({ valid: false, errors: ['Malformed JSON structure'] });
    }
};
