/**
 * Plan Approval Component
 * Shows the generated plan to the user before execution with Allow/Modify options
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { CheckCircle2, Edit3, AlertCircle, Sparkles } from 'lucide-react';

export function PlanApprovalDialog({ open, onOpenChange, plan, originalRequest, onApprove, onModify }) {
  const [isModifying, setIsModifying] = useState(false);
  const [modifiedRequest, setModifiedRequest] = useState(originalRequest);
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove();
    } finally {
      setIsLoading(false);
    }
  };

  const handleModify = async () => {
    if (!isModifying) {
      setIsModifying(true);
      return;
    }

    if (modifiedRequest.trim() === '') {
      return;
    }

    setIsLoading(true);
    try {
      await onModify(modifiedRequest);
      setIsModifying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModifying(false);
    setModifiedRequest(originalRequest);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Review Execution Plan</DialogTitle>
              <DialogDescription>
                Review the plan before I start working on your request
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Original Request */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              Your Request
            </h3>
            <div className="p-3 bg-secondary/50 rounded-lg border border-border">
              <p className="text-sm">{originalRequest}</p>
            </div>
          </div>

          {/* Generated Plan */}
          {!isModifying && plan && plan.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Execution Plan ({plan.length} steps)
              </h3>
              <div className="space-y-2">
                {plan.map((step, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        {step.step || index + 1}
                      </div>
                      <p className="text-sm flex-1">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modify Mode */}
          {isModifying && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-500" />
                Modify Your Request
              </h3>
              <Textarea
                value={modifiedRequest}
                onChange={(e) => setModifiedRequest(e.target.value)}
                placeholder="Describe what you want me to do..."
                className="min-h-[120px]"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Update your request and I'll generate a new plan
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!isModifying ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsModifying(true)}
                disabled={isLoading}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Modify
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Allow & Execute
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleModify}
                disabled={isLoading || modifiedRequest.trim() === ''}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate New Plan
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
