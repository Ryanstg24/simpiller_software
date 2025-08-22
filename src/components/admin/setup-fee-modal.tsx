import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, X, Save } from "lucide-react";
import { supabase } from '@/lib/supabase';

interface SetupFeeModalProps {
  organization: {
    id: string;
    name: string;
    setup_fee: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function SetupFeeModal({ organization, isOpen, onClose, onUpdate }: SetupFeeModalProps) {
  const [setupFee, setSetupFee] = useState(organization.setup_fee.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fee = parseFloat(setupFee);
      if (isNaN(fee) || fee < 0) {
        throw new Error('Please enter a valid setup fee amount');
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ setup_fee: fee })
        .eq('id', organization.id);

      if (updateError) {
        throw new Error('Failed to update setup fee');
      }

      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSetupFee(organization.setup_fee.toString());
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Edit Setup Fee
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-black">Organization</Label>
            <p className="text-lg font-semibold text-gray-900">{organization.name}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-black">Setup Fee ($)</Label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="number"
                value={setupFee}
                onChange={(e) => setSetupFee(e.target.value)}
                className="pl-10 bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter 0 to waive the setup fee, or any amount above 0
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 