/**
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use self file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

(function() {
  'use strict';

  /**
   * @ngDoc factory
   * @name horizon.dashboard.castellan.manages.delete.service
   * @Description
   * Brings up the delete manages confirmation modal dialog.
   * On submit, delete selected resources.
   * On cancel, do nothing.
   */
  angular
    .module('horizon.dashboard.castellan.manages')
    .factory('horizon.dashboard.castellan.manages.delete.service', deleteService);

  deleteService.$inject = [
    '$location',
    '$q',
    'horizon.app.core.openstack-service-api.castellan',
    'horizon.app.core.openstack-service-api.policy',
    'horizon.framework.util.actions.action-result.service',
    'horizon.framework.util.i18n.gettext',
    'horizon.framework.util.q.extensions',
    'horizon.framework.widgets.modal.deleteModalService',
    'horizon.framework.widgets.toast.service',
    'horizon.dashboard.castellan.manages.resourceType',
    'horizon.dashboard.castellan.manages.events'
  ];

  function deleteService(
    $location, $q, api, policy, actionResult, gettext, $qExtensions,
    deleteModal, toast, resourceType, events
  ) {
    var scope;
    var context = {
      labels: null,
      deleteEntity: deleteEntity,
      successEvent: events.DELETE_SUCCESS
    };
    var service = {
      initAction: initAction,
      allowed: allowed,
      perform: perform
    };
    var notAllowedMessage =
      gettext("You are not allowed to delete manages: %s");

    return service;

    //////////////

    // fixme: include this function in your service
    // if you plan to emit events to the parent controller,
    // otherwise remove it
    function initAction() {
    }

    function allowed() {
      return $qExtensions.booleanAsPromise(true);
      // fixme: if you need to set policy, change as follow
      //return policy.ifAllowed({ rules: [['manage', 'delete_manage']] });
    }

    // delete selected resource objects
    function perform(selected, newScope) {
      scope = newScope;
      selected = angular.isArray(selected) ? selected : [selected];
      context.labels = labelize(selected.length);
      return $qExtensions.allSettled(selected.map(checkPermission)).then(afterCheck);
    }

    function labelize(count) {
      return {
        title: ngettext('Confirm Delete Manage',
                        'Confirm Delete Manages', count),
        /* eslint-disable max-len */
        message: ngettext('You have selected "%s". Please confirm your selection. Deleted manage is not recoverable.',
                          'You have selected "%s". Please confirm your selection. Deleted manages are not recoverable.', count),
        /* eslint-enable max-len */
        submit: ngettext('Delete Manage',
                         'Delete Manages', count),
        success: ngettext('Deleted Manage: %s.',
                          'Deleted Manages: %s.', count),
        error: ngettext('Unable to delete Manage: %s.',
                        'Unable to delete Manages: %s.', count)
      };
    }

    // for batch delete
    function checkPermission(selected) {
      return {promise: allowed(selected), context: selected};
    }

    // for batch delete
    function afterCheck(result) {
      var outcome = $q.reject();  // Reject the promise by default
      if (result.fail.length > 0) {
        toast.add('error', getMessage(notAllowedMessage, result.fail));
        outcome = $q.reject(result.fail);
      }
      if (result.pass.length > 0) {
        outcome = deleteModal.open(scope, result.pass.map(getEntity), context).then(createResult);
      }
      return outcome;
    }

    function createResult(deleteModalResult) {
      // To make the result of this action generically useful, reformat the return
      // from the deleteModal into a standard form
      var result = actionResult.getActionResult();
      deleteModalResult.pass.forEach(function markDeleted(item) {
        result.deleted(resourceType, getEntity(item).id);
      });
      deleteModalResult.fail.forEach(function markFailed(item) {
        result.failed(resourceType, getEntity(item).id);
      });
      if (result.result.failed.length === 0 && result.result.deleted.length > 0) {
        $location.path('/project/manages');
      } else {
        return result.result;
      }
    }

    function getMessage(message, entities) {
      return interpolate(message, [entities.map(getName).join(", ")]);
    }

    function getName(result) {
      return getEntity(result).name;
    }

    // for batch delete
    function getEntity(result) {
      return result.context;
    }

    // call delete REST API
    function deleteEntity(id) {
      return api.deleteManage(id, true);
    }
  }
})();