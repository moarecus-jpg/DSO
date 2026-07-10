import { ExternalLink } from "lucide-react";

import { EditableParticipantName } from "./EditableParticipantName.jsx";
import {
  formatPrice,

  listingIdFor,

  platCountLabel,

  recordTitle,

} from "../../shared/orderTotals.js";



export function RecordList({
  links = [],
  orderGrandTotal,
  canManageMembers = false,
  onRenameLink,
}) {

  if (!links.length) return null;



  const { itemsTotal, total, currency, hasUnknown, count } = orderGrandTotal ?? {};
  const platTotal = itemsTotal ?? total;



  return (

    <div className="order-items card">

      <table className="order-items-table">

        <thead>

          <tr>

            <th className="col-participant">Naročil</th>

            <th className="col-item">ID</th>

            <th className="col-price">Cena</th>

          </tr>

        </thead>

        <tbody>

          {links.map((link) => (

            <tr key={link.id}>

              <td className="col-participant">
                <EditableParticipantName
                  className="order-participant"
                  value={link.user_name ?? "Neznan"}
                  placeholder={link.member_name ?? "Ime"}
                  canEdit={canManageMembers && Boolean(onRenameLink)}
                  onSave={(name) => onRenameLink(link.id, name)}
                />
              </td>

              <td className="col-item">

                <div className="order-item-cell">

                  <a

                    href={link.url}

                    target="_blank"

                    rel="noreferrer"

                    className="order-listing-id"

                  >

                    {listingIdFor(link)}

                    <ExternalLink size={12} aria-hidden />

                  </a>

                  <a

                    href={link.url}

                    target="_blank"

                    rel="noreferrer"

                    className="order-item-title"

                  >

                    {recordTitle(link)}

                  </a>

                  {link.media_condition && (

                    <p className="order-item-condition">

                      Media Condition: {link.media_condition}

                    </p>

                  )}

                  {link.sleeve_condition && (

                    <p className="order-item-condition">

                      Sleeve Condition: {link.sleeve_condition}

                    </p>

                  )}

                </div>

              </td>

              <td className="col-price">

                {formatPrice(link.price_value, link.price_currency)}

              </td>

            </tr>

          ))}

        </tbody>

        <tfoot>

          <tr className="order-subtotal-row">

            <td colSpan={2}>Vmesna vsota za {platCountLabel(count ?? links.length)}</td>

            <td className="col-price">{formatPrice(platTotal, currency)}</td>

          </tr>

          <tr className="order-total-row">

            <td colSpan={2}>

              <strong>Skupaj</strong>

            </td>

            <td className="col-price">

              <strong className="order-grand-total">

                {formatPrice(total, currency)}

              </strong>

              {hasUnknown && (

                <span className="muted fine"> · nekatere brez cene</span>

              )}

            </td>

          </tr>

        </tfoot>

      </table>

    </div>

  );

}

